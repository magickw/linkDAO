import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

// Admin roles hierarchy
export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MODERATOR = 'moderator'
}

// Permission constants
export const ADMIN_PERMISSIONS = {
  // User management
  'users.view': 'View user list and details',
  'users.edit': 'Edit user information',
  'users.suspend': 'Suspend/unsuspend users',
  'users.delete': 'Delete user accounts',

  // Content moderation
  'content.moderate': 'Moderate user content',
  'content.delete': 'Delete user content',
  'content.feature': 'Feature content',

  // Marketplace
  'marketplace.seller_review': 'Review seller applications',
  'marketplace.manage': 'Manage marketplace settings',

  // Disputes
  'disputes.view': 'View disputes',
  'disputes.resolve': 'Resolve disputes',

  // System
  'system.analytics': 'View system analytics',
  'system.settings': 'Modify system settings',
  'system.audit': 'View audit logs',

  // Admin management
  'admin.manage': 'Manage admin users',
  'admin.roles': 'Manage roles and permissions'
};

// Role-based default permissions
export const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  [AdminRole.SUPER_ADMIN]: Object.keys(ADMIN_PERMISSIONS), // All permissions
  [AdminRole.ADMIN]: [
    'users.view',
    'users.edit',
    'users.suspend',
    'content.moderate',
    'content.delete',
    'content.feature',
    'marketplace.seller_review',
    'marketplace.manage',
    'disputes.view',
    'disputes.resolve',
    'system.analytics',
    'system.audit'
  ],
  [AdminRole.MODERATOR]: [
    'users.view',
    'content.moderate',
    'content.delete',
    'disputes.view',
    'system.analytics'
  ]
};

// Session tracking for activity-based renewal
interface AdminSession {
  userId: string;
  lastActivity: Date;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
}

const activeSessions = new Map<string, AdminSession>();

// Admin session configuration
const ADMIN_SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const ADMIN_SESSION_MAX_LIFETIME = 8 * 60 * 60 * 1000; // 8 hours

export interface AdminAuthenticatedUser {
  address: string;
  walletAddress: string;
  userId: string;
  id: string;
  role: AdminRole;
  permissions: string[];
  isAdmin: boolean;
  sessionId?: string;
}

export interface AdminAuthenticatedRequest extends Request {
  user?: AdminAuthenticatedUser;
}

/**
 * Verify JWT token and extract admin user information
 */
function verifyAdminToken(token: string): AdminAuthenticatedUser | null {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback-secret'
    ) as any;

    // Verify admin status
    if (!decoded.isAdmin && !decoded.role) {
      return null;
    }

    // Determine role
    let role: AdminRole = AdminRole.MODERATOR;
    if (decoded.role === 'super_admin') {
      role = AdminRole.SUPER_ADMIN;
    } else if (decoded.role === 'admin') {
      role = AdminRole.ADMIN;
    }

    // Get permissions from token or use role defaults
    const permissions = decoded.permissions || ROLE_PERMISSIONS[role] || [];

    return {
      address: decoded.walletAddress || decoded.address,
      walletAddress: decoded.walletAddress || decoded.address,
      userId: decoded.userId || decoded.id,
      id: decoded.userId || decoded.id,
      role,
      permissions,
      isAdmin: true,
      sessionId: decoded.sessionId
    };
  } catch (error) {
    return null;
  }
}

/**
 * Check if admin session is valid and active
 */
function isSessionValid(sessionId: string, userId: string): boolean {
  const session = activeSessions.get(sessionId);

  if (!session || session.userId !== userId) {
    return false;
  }

  const now = new Date();

  // Check if session expired
  if (session.expiresAt < now) {
    activeSessions.delete(sessionId);
    return false;
  }

  // Update last activity for activity-based renewal
  session.lastActivity = now;
  session.expiresAt = new Date(now.getTime() + ADMIN_SESSION_TIMEOUT);

  return true;
}

/**
 * Create or update admin session
 */
function createOrUpdateSession(
  userId: string,
  ipAddress: string,
  userAgent: string
): string {
  const sessionId = `admin_${userId}_${Date.now()}`;
  const now = new Date();

  const session: AdminSession = {
    userId,
    lastActivity: now,
    expiresAt: new Date(now.getTime() + ADMIN_SESSION_TIMEOUT),
    ipAddress,
    userAgent
  };

  activeSessions.set(sessionId, session);

  return sessionId;
}

/**
 * Main admin authentication middleware
 * Verifies JWT token and checks if user has admin privileges
 */
export const adminAuthMiddleware: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Admin access token required'
    });
    return;
  }

  // Verify and decode token
  const adminUser = verifyAdminToken(token);

  if (!adminUser) {
    res.status(403).json({
      success: false,
      error: 'Invalid admin token or insufficient privileges'
    });
    return;
  }

  // Check session validity if session management is enabled
  if (adminUser.sessionId && !isSessionValid(adminUser.sessionId, adminUser.userId)) {
    res.status(401).json({
      success: false,
      error: 'Admin session expired. Please re-authenticate.'
    });
    return;
  }

  // Create/update session
  const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  if (!adminUser.sessionId) {
    adminUser.sessionId = createOrUpdateSession(adminUser.userId, ipAddress, userAgent);
  }

  // Attach admin user to request
  (req as AdminAuthenticatedRequest).user = adminUser;

  next();
};

/**
 * Permission check middleware factory
 * Creates middleware that checks if admin has specific permission
 */
export const requirePermission = (permission: string): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const adminReq = req as AdminAuthenticatedRequest;

    if (!adminReq.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    // Super admins have all permissions
    if (adminReq.user.role === AdminRole.SUPER_ADMIN) {
      next();
      return;
    }

    // Check if user has the required permission
    if (!adminReq.user.permissions.includes(permission)) {
      res.status(403).json({
        success: false,
        error: `Permission denied. Required permission: ${permission}`,
        requiredPermission: permission
      });
      return;
    }

    next();
  };
};

/**
 * Role check middleware factory
 * Creates middleware that checks if admin has specific role or higher
 */
export const requireRole = (minimumRole: AdminRole): RequestHandler => {
  const roleHierarchy = {
    [AdminRole.MODERATOR]: 1,
    [AdminRole.ADMIN]: 2,
    [AdminRole.SUPER_ADMIN]: 3
  };

  return (req: Request, res: Response, next: NextFunction): void => {
    const adminReq = req as AdminAuthenticatedRequest;

    if (!adminReq.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    const userRoleLevel = roleHierarchy[adminReq.user.role] || 0;
    const requiredRoleLevel = roleHierarchy[minimumRole] || 0;

    if (userRoleLevel < requiredRoleLevel) {
      res.status(403).json({
        success: false,
        error: `Insufficient role. Required: ${minimumRole}, Current: ${adminReq.user.role}`
      });
      return;
    }

    next();
  };
};

/**
 * Rate limiting for admin endpoints
 * More lenient than public endpoints but still prevents abuse
 */
export const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per windowMs per IP
  message: {
    success: false,
    error: 'Too many admin requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for super admins if needed
  skip: (req) => {
    const adminReq = req as AdminAuthenticatedRequest;
    return adminReq.user?.role === AdminRole.SUPER_ADMIN;
  }
});

/**
 * Stricter rate limiting for sensitive operations
 */
export const strictAdminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many sensitive operations, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Audit logging middleware for admin actions
 */
export const adminAuditLogger: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const adminReq = req as AdminAuthenticatedRequest;

  if (adminReq.user) {
    // Store original send function
    const originalSend = res.send;

    // Override send to capture response
    res.send = function(data): Response {
      // Log admin action (in production, send to audit service)
      const auditLog = {
        timestamp: new Date(),
        adminId: adminReq.user?.userId,
        adminRole: adminReq.user?.role,
        action: `${req.method} ${req.path}`,
        ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        statusCode: res.statusCode,
        requestBody: req.method !== 'GET' ? req.body : undefined
      };

      // TODO: Send to audit logging service
      console.log('[ADMIN AUDIT]', JSON.stringify(auditLog));

      // Call original send
      return originalSend.call(this, data);
    };
  }

  next();
};

/**
 * Clean up expired sessions periodically
 */
setInterval(() => {
  const now = new Date();
  for (const [sessionId, session] of activeSessions.entries()) {
    if (session.expiresAt < now) {
      activeSessions.delete(sessionId);
    }
  }
}, 60000); // Clean up every minute

/**
 * Get active admin sessions count (for monitoring)
 */
export function getActiveAdminSessionsCount(): number {
  return activeSessions.size;
}

/**
 * Revoke admin session
 */
export function revokeAdminSession(sessionId: string): boolean {
  return activeSessions.delete(sessionId);
}

/**
 * Get all active sessions for a user
 */
export function getUserSessions(userId: string): AdminSession[] {
  const sessions: AdminSession[] = [];
  for (const [sessionId, session] of activeSessions.entries()) {
    if (session.userId === userId) {
      sessions.push(session);
    }
  }
  return sessions;
}
