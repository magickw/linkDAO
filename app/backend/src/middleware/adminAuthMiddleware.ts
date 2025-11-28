import { Request, Response, NextFunction } from 'express';
import { safeLogger } from '../utils/safeLogger';

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
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if user has admin role
    const adminRoles = ['super_admin', 'admin', 'moderator', 'analyst'];
    if (!adminRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
        details: `Role '${user.role}' is not authorized for admin operations`
      });
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
    res.status(500).json({
      success: false,
      error: 'Internal server error during role validation'
    });
  }
};

// Permission-based access control
export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
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
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          details: `Permission '${permission}' is required for this operation`
        });
      }

      next();
    } catch (error) {
      safeLogger.error('Permission validation error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during permission validation'
      });
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
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Check if user has one of the required roles
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient role privileges',
          details: `One of the following roles is required: ${allowedRoles.join(', ')}`
        });
      }

      next();
    } catch (error) {
      safeLogger.error('Role validation error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during role validation'
      });
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
      
      const userRequests = requests.get(key);
      
      if (!userRequests) {
        requests.set(key, { count: 1, resetTime: now + windowMs });
        return next();
      }
      
      if (userRequests.resetTime < now) {
        // Reset the window
        requests.set(key, { count: 1, resetTime: now + windowMs });
        return next();
      }
      
      if (userRequests.count >= maxRequests) {
        return res.status(429).json({
          success: false,
          error: 'Too many requests',
          details: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowMs / 1000} seconds.`,
          retryAfter: Math.ceil((userRequests.resetTime - now) / 1000)
        });
      }
      
      userRequests.count++;
      next();
    } catch (error) {
      safeLogger.error('Admin rate limiting error:', error);
      // Don't fail the request due to rate limiting issues
      next();
    }
  };
};

// IP whitelist middleware for admin access
export const adminIPWhitelist = (allowedIPs: string[] = []) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Skip IP checking if no whitelist is configured
      if (allowedIPs.length === 0) {
        return next();
      }

      const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
      
      if (!clientIP || !allowedIPs.includes(clientIP)) {
        safeLogger.warn(`Admin access denied from IP: ${clientIP}`);
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          details: 'Admin access is restricted to authorized IP addresses'
        });
      }

      next();
    } catch (error) {
      safeLogger.error('IP whitelist validation error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during IP validation'
      });
    }
  };
};

// Session validation for admin users
export const validateAdminSession = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Add session validation logic here
    // This could check session expiry, concurrent sessions, etc.
    
    // For now, just validate that we have required user fields
    if (!user.id || !user.email || !user.role) {
      return res.status(401).json({
        success: false,
        error: 'Invalid session data'
      });
    }

    next();
  } catch (error) {
    safeLogger.error('Session validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during session validation'
    });
  }
};

// Combine multiple admin middlewares for convenience
export const adminAuth = {
  validateRole: validateAdminRole,
  requirePermission,
  requireRole,
  auditAction: auditAdminAction,
  rateLimit: adminRateLimit,
  ipWhitelist: adminIPWhitelist,
  validateSession: validateAdminSession
};

// Default admin middleware stack
export const defaultAdminMiddleware = [
  validateAdminSession,
  validateAdminRole,
  adminRateLimit(),
  auditAdminAction('admin_operation')
];

// Backward compatibility aliases
export const adminAuthMiddleware = validateAdminRole;
