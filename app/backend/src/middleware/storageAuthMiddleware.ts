import { Request, Response, NextFunction } from 'express';
import { selfHostedStorageService } from '../services/selfHostedStorageService';
import { safeLogger } from '../utils/safeLogger';
import { ApiResponse } from '../utils/apiResponse';

// Define user roles for access control
export type UserRole = 'admin' | 'user' | 'moderator' | 'guest';

// Define permissions
export type Permission = 'read' | 'write' | 'delete' | 'admin';

// User session interface
export interface StorageUser {
  id: string;
  walletAddress: string;
  role: UserRole;
  permissions: Permission[];
  isAuthenticated: boolean;
}

// Authentication middleware
export const storageAuthMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      ApiResponse.unauthorized(res, 'Authentication token required');
      return;
    }

    // In a real implementation, you would verify the token with your auth service
    // For now, we'll extract user info from the request or use a mock user
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const userRole = (req.headers['x-user-role'] as UserRole) || 'user';
    
    // Attach user to request
    (req as any).storageUser = {
      id: userId,
      walletAddress: req.headers['x-wallet-address'] as string || userId,
      role: userRole,
      permissions: getUserPermissions(userRole),
      isAuthenticated: true
    };

    next();
  } catch (error) {
    safeLogger.error('Storage authentication error:', error);
    ApiResponse.unauthorized(res, 'Authentication failed');
  }
};

// Permission checking middleware
export const storagePermissionMiddleware = (requiredPermission: Permission) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).storageUser as StorageUser;
      
      if (!user || !user.isAuthenticated) {
        ApiResponse.unauthorized(res, 'Authentication required');
        return;
      }

      // Check if user has required permission
      if (!user.permissions.includes(requiredPermission) && user.role !== 'admin') {
        ApiResponse.forbidden(res, 'Insufficient permissions');
        return;
      }

      next();
    } catch (error) {
      safeLogger.error('Permission check error:', error);
      ApiResponse.serverError(res, 'Permission check failed');
    }
  };
};

// Get permissions based on user role
export const getUserPermissions = (role: UserRole): Permission[] => {
  const rolePermissions: Record<UserRole, Permission[]> = {
    'admin': ['read', 'write', 'delete', 'admin'],
    'moderator': ['read', 'write', 'delete'],
    'user': ['read', 'write'],
    'guest': ['read']
  };

  return rolePermissions[role] || ['read'];
};

// File access control middleware
export const fileAccessMiddleware = (accessType: 'read' | 'write' | 'delete') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).storageUser as StorageUser;
      const fileId = req.params.fileId;

      if (!user || !user.isAuthenticated) {
        ApiResponse.unauthorized(res, 'Authentication required');
        return;
      }

      if (!fileId) {
        ApiResponse.badRequest(res, 'File ID required');
        return;
      }

      // Load file metadata to check access permissions
      try {
        const { metadata } = await selfHostedStorageService.downloadFile(fileId, user.id);
        
        // Check access based on requested operation
        let hasPermission = false;
        
        switch (accessType) {
          case 'read':
            hasPermission = metadata.accessControl.owner === user.id || 
                           metadata.accessControl.readPermissions.includes(user.id) ||
                           metadata.accessControl.readPermissions.includes('public');
            break;
          case 'write':
          case 'delete':
            hasPermission = metadata.accessControl.owner === user.id || 
                           metadata.accessControl.writePermissions.includes(user.id);
            break;
        }

        if (!hasPermission) {
          ApiResponse.forbidden(res, 'Access denied');
          return;
        }
      } catch (error) {
        // If file doesn't exist, let the next handler deal with it
        if ((error as any).message !== 'File download failed: ENOENT: no such file or directory') {
          throw error;
        }
      }

      next();
    } catch (error) {
      safeLogger.error('File access check error:', error);
      ApiResponse.serverError(res, 'Access check failed');
    }
  };
};

// Rate limiting for storage operations
export const storageRateLimiter = (maxRequests: number = 100, windowMs: number = 60000) => {
  const requestCounts: Record<string, { count: number; resetTime: number }> = {};

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).storageUser?.id || req.ip || 'anonymous';
      const now = Date.now();
      
      // Clean up old entries
      for (const key in requestCounts) {
        if (requestCounts[key].resetTime < now) {
          delete requestCounts[key];
        }
      }

      // Initialize or update request count
      if (!requestCounts[userId]) {
        requestCounts[userId] = {
          count: 1,
          resetTime: now + windowMs
        };
      } else {
        requestCounts[userId].count++;
      }

      // Check rate limit
      if (requestCounts[userId].count > maxRequests) {
        const retryAfter = Math.ceil((requestCounts[userId].resetTime - now) / 1000);
        ApiResponse.tooManyRequests(res, 'Too many requests', { retryAfter });
        return;
      }

      next();
    } catch (error) {
      safeLogger.error('Storage rate limiting error:', error);
      // Don't block requests if rate limiting fails
      next();
    }
  };
};