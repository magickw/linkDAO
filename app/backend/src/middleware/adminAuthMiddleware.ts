import { Request, Response, NextFunction } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { ApiResponse } from '../utils/apiResponse';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

// Admin role validation middleware
export const validateAdminRole = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    
    if (!user) {
      return ApiResponse.unauthorized(res, 'Authentication required');
    }

    // Check if user has admin role
    const adminRoles = ['super_admin', 'admin', 'moderator', 'analyst', 'support'];
    if (!adminRoles.includes(user.role)) {
      return ApiResponse.forbidden(res, 'Admin access required');
    }

    // Enforce MFA for high-privilege roles (optional but recommended)
    if ((user.role === 'admin' || user.role === 'super_admin') && process.env.ENFORCE_ADMIN_MFA === 'true') {
      const mfaVerified = (req as any).session?.mfaVerified;
      if (!mfaVerified) {
        return ApiResponse.forbidden(res, 'Multi-factor authentication required for admin accounts');
      }
    }

    // Additional check for configured admin address
    const configuredAdminAddress = process.env.NEXT_PUBLIC_ADMIN_ADDRESS || 
      process.env.ADMIN_ADDRESS || 
      '0xEe034b53D4cCb101b2a4faec27708be507197350';
      
    // If this is the configured admin address, ensure they have proper permissions
    if (user.role === 'admin') {
      // Ensure admin has required permissions
      const requiredPermissions = ['admin_access', 'manage_users', 'manage_content'];
      const userPermissions = user.permissions || [];
      
      // Add missing permissions if not present
      const missingPermissions = requiredPermissions.filter(perm => !userPermissions.includes(perm));
      if (missingPermissions.length > 0) {
        user.permissions = [...userPermissions, ...missingPermissions];
      }
    }

    next();
  } catch (error) {
    safeLogger.error('Admin role validation error:', error);
    ApiResponse.serverError(res, 'Internal server error during role validation');
  }
};

// Permission-based access control
export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        return ApiResponse.unauthorized(res, 'Authentication required');
      }

      // Super admins have all permissions
      if (user.role === 'super_admin') {
        return next();
      }

      // Check for wildcard permission
      if (user.permissions && user.permissions.includes('*')) {
        return next();
      }

      // Check if user has the required permission
      if (!user.permissions || !user.permissions.includes(permission)) {
        return ApiResponse.forbidden(res, 'Insufficient permissions');
      }

      next();
    } catch (error) {
      safeLogger.error('Permission validation error:', error);
      ApiResponse.serverError(res, 'Internal server error during permission validation');
    }
  };
};

// Role-based access control
export const requireRole = (roles: string | string[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      
      if (!user) {
        return ApiResponse.unauthorized(res, 'Authentication required');
      }

      // Check if user has one of the required roles
      if (!allowedRoles.includes(user.role)) {
        return ApiResponse.forbidden(res, 'Insufficient role privileges');
      }

      next();
    } catch (error) {
      safeLogger.error('Role validation error:', error);
      ApiResponse.serverError(res, 'Internal server error during role validation');
    }
  };
};

// Audit logging middleware for admin actions
export const auditAdminAction = (action: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      
      if (user) {
        // Log the admin action
        safeLogger.info(`Admin Action: ${action}`, {
          adminId: user.id,
          email: user.email,
          role: user.role,
          timestamp: new Date().toISOString(),
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          method: req.method,
          path: req.path,
          body: req.method !== 'GET' ? req.body : undefined
        });

        // Add audit info to response locals for potential use in controllers
        res.locals.auditInfo = {
          action,
          adminId: user.id,
          timestamp: new Date().toISOString()
        };
      }

      next();
    } catch (error) {
      safeLogger.error('Audit logging error:', error);
      // Don't fail the request due to audit logging issues
      next();
    }
  };
};

// Rate limiting for admin operations
export const adminRateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      
      if (!user) {
        return next(); // Let auth middleware handle this
      }

      const key = `admin_${user.id}`;
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Clean up old entries
      for (const [k, v] of Array.from(requests.entries())) {
        if (v.resetTime < windowStart) {
          requests.delete(k);
        }
      }

      // Get or create request count
      const requestInfo = requests.get(key) || { count: 0, resetTime: now + windowMs };
      
      // Reset count if window has passed
      if (now > requestInfo.resetTime) {
        requestInfo.count = 0;
        requestInfo.resetTime = now + windowMs;
      }
      
      // Increment count
      requestInfo.count++;
      requests.set(key, requestInfo);
      
      // Check if limit exceeded
      if (requestInfo.count > maxRequests) {
        const retryAfter = Math.ceil((requestInfo.resetTime - now) / 1000);
        res.set('Retry-After', retryAfter.toString());
      return ApiResponse.tooManyRequests(res, 'Too many admin requests');
      }
      
      next();
    } catch (error) {
      safeLogger.error('Admin rate limiting error:', error);
      // Don't block requests if rate limiting fails
      next();
    }
  };
};

export const adminAuthMiddleware = validateAdminRole;