import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';
import { ApiResponse } from '../utils/apiResponse';
import { tokenRevocationService } from '../services/tokenRevocationService';
import { getRequiredEnv, isDevelopment } from '../utils/envValidation';
import { safeLogger } from '../utils/safeLogger';

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
    console.warn(`[AuthMiddleware] No token provided for ${req.method} ${req.path}`);
    res.setHeader('WWW-Authenticate', 'Bearer realm="LinkDAO API", error="invalid_token", error_description="Access token required"');
    res.status(401).json({
      success: false,
      error: 'Access token required',
      code: 'NO_TOKEN',
      message: 'Please provide an access token in the Authorization header'
    });
    return;
  }

  try {
    let decoded: any;

    // Verify JWT token - no development bypass for security
    const jwtSecret = isDevelopment()
      ? (process.env.JWT_SECRET || 'development-secret-key-change-in-production')
      : getRequiredEnv('JWT_SECRET');

    decoded = jwt.verify(token, jwtSecret) as any;

    // Check token expiration (JWT library already validates exp, but we double-check)
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      throw new Error('Token has expired');
    }

    // Check if token is revoked (if jti claim exists)
    if (decoded.jti) {
      const isRevoked = await tokenRevocationService.isTokenRevoked(decoded.jti);
      if (isRevoked) {
        safeLogger.warn(`[AuthMiddleware] Revoked token attempted: ${decoded.jti}`);
        throw new Error('Token has been revoked');
      }
    }

    // Check if all user tokens are revoked (e.g., after password change)
    if (decoded.userId && decoded.iat) {
      const areUserTokensRevoked = await tokenRevocationService.areUserTokensRevoked(
        decoded.userId,
        decoded.iat * 1000
      );
      if (areUserTokensRevoked) {
        safeLogger.warn(`[AuthMiddleware] User tokens revoked: ${decoded.userId}`);
        throw new Error('All user tokens have been revoked. Please sign in again.');
      }
    }

    // Get user role and other details from database
    let userRole = 'user';
    let userEmail = null;
    let userPermissions: string[] = [];
    let isAdmin = false;

    // Get the wallet address for admin check
    const walletAddress = (decoded.walletAddress || decoded.address || '').toLowerCase();

    // Check if this is the configured admin address
    const configuredAdminAddress = (
      process.env.NEXT_PUBLIC_ADMIN_ADDRESS ||
      process.env.ADMIN_ADDRESS ||
      '0xEe034b53D4cCb101b2a4faec27708be507197350'
    ).toLowerCase();

    const isConfiguredAdmin = walletAddress === configuredAdminAddress;

    let userRecord: any = null;
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
          userRecord = userResult[0];
          userRole = userRecord.role || 'user';
          userEmail = userRecord.email;
          userPermissions = (userRecord.permissions as string[]) || [];
          isAdmin = ['admin', 'super_admin', 'moderator', 'support', 'analyst'].includes(userRole);

          // Block wallet-only authentication for employees for sensitive operations
          // but allow basic access with a flag to indicate they need to upgrade auth
          const isEmployee = userRecord.isEmployee;
          const hasPasswordHash = !!userRecord.passwordHash;
          const needsAuthUpgrade = isEmployee && !hasPasswordHash;

          // Check if this is a sensitive operation that requires upgraded auth
          const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
          const sensitivePrefixes = [
            '/api/admin',
            '/api/employees',
            '/api/auth/change-password',
            '/api/auth/update'
          ];

          const isSensitiveOperation = isMutation && sensitivePrefixes.some(prefix =>
            req.path.startsWith(prefix)
          );

          if (needsAuthUpgrade && isSensitiveOperation) {
            return ApiResponse.unauthorized(res, 'Employees must use email and password authentication for sensitive operations');
          }
        }
      } catch (dbError) {
        console.error('Database error when fetching user details:', dbError);
      }
    }

    // Override role for configured admin address
    if (isConfiguredAdmin) {
      // Ensure configured admin has a database record
      if (!userRecord) {
        return ApiResponse.unauthorized(
          res,
          'Admin account must be initialized before use'
        );
      }

      userRole = 'super_admin';
      isAdmin = true;
      // Grant all permissions to configured admin
      userPermissions = [
        '*', // Wildcard permission
        'admin_access',
        'manage_users',
        'manage_content',
        'content.moderate',
        'marketplace.seller_review',
        'marketplace.seller_view',
        'disputes.view',
        'disputes.resolve',
        'users.view',
        'users.manage',
        'system.analytics',
        'system.audit',
        'system.security',
        'system.settings',
        'system.monitor',
        'governance.verify'
      ];
    }

    // Determine needsAuthUpgrade based on user record
    const userNeedsAuthUpgrade = userRecord?.isEmployee && !userRecord?.passwordHash;

    // Normalize user object to match expected interface
    // IMPORTANT: Normalize wallet addresses to lowercase for consistent comparisons
    const normalizedAddress = (decoded.walletAddress || decoded.address || '').toLowerCase();
    const areq = req as AuthenticatedRequest;
    areq.user = {
      address: normalizedAddress,
      walletAddress: normalizedAddress,
      userId: decoded.userId || decoded.id,
      id: decoded.userId || decoded.id || normalizedAddress,
      kycStatus: decoded.kycStatus,
      permissions: userPermissions,
      role: userRole,
      email: userEmail,
      isAdmin: isAdmin,
      needsAuthUpgrade: userNeedsAuthUpgrade
    };

    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isExpired = errorMessage.includes('expired') || errorMessage.includes('jwt expired');
    const isInvalid = errorMessage.includes('invalid') || errorMessage.includes('malformed');

    console.error(`[AuthMiddleware] Token validation failed for ${req.method} ${req.path}:`, {
      error: errorMessage,
      isExpired,
      isInvalid,
      tokenPrefix: token?.substring(0, 20) + '...'
    });

    // Set appropriate WWW-Authenticate header
    if (isExpired) {
      res.setHeader('WWW-Authenticate', 'Bearer realm="LinkDAO API", error="invalid_token", error_description="Token has expired"');
    } else if (isInvalid) {
      res.setHeader('WWW-Authenticate', 'Bearer realm="LinkDAO API", error="invalid_token", error_description="Token is malformed or invalid"');
    } else {
      res.setHeader('WWW-Authenticate', 'Bearer realm="LinkDAO API", error="invalid_token", error_description="Token validation failed"');
    }

    res.status(403).json({
      success: false,
      error: 'Invalid token',
      code: isExpired ? 'TOKEN_EXPIRED' : (isInvalid ? 'TOKEN_INVALID' : 'TOKEN_VALIDATION_FAILED'),
      message: isExpired ? 'Your session has expired. Please sign in again.' :
        isInvalid ? 'The provided token is invalid.' :
          'Token validation failed. Please sign in again.'
    });
    return;
  }
};