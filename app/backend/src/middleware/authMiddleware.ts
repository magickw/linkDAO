import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';

export interface AuthenticatedUser {
  address: string;
  walletAddress: string;
  userId?: string;
  kycStatus?: string;
  permissions?: string[];
  role?: string;
  email?: string;
  id: string; // required to match globally-augmented Request.user
  isAdmin?: boolean;
  [key: string]: any; // keep compatibility with broader user shape
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const authMiddleware: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    // Get user role and other details from database
    let userRole = 'user';
    let userEmail = null;
    let userPermissions = [];
    let isAdmin = false;
    
    if (decoded.userId) {
      try {
        const connectionString = process.env.DATABASE_URL!;
        const sql = postgres(connectionString, { ssl: 'require' });
        const db = drizzle(sql);
        
        const userResult = await db
          .select()
          .from(users)
          .where(eq(users.id, decoded.userId))
          .limit(1);
          
        if (userResult.length > 0) {
          userRole = userResult[0].role || 'user';
          userEmail = userResult[0].email;
          userPermissions = userResult[0].permissions || [];
          isAdmin = ['admin', 'super_admin', 'moderator'].includes(userRole);
        }
      } catch (dbError) {
        console.error('Database error when fetching user details:', dbError);
      }
    }

    // Normalize user object to match expected interface
    const areq = req as AuthenticatedRequest;
    areq.user = {
      address: decoded.walletAddress || decoded.address,
      walletAddress: decoded.walletAddress || decoded.address,
      userId: decoded.userId || decoded.id,
      id: decoded.userId || decoded.id || decoded.walletAddress || decoded.address,
      kycStatus: decoded.kycStatus,
      permissions: userPermissions,
      role: userRole,
      email: userEmail,
      isAdmin: isAdmin
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