/**
 * Authentication Security Middleware
 * Comprehensive authentication and authorization security measures
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ApiResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export interface AuthSecurityConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
  maxLoginAttempts: number;
  lockoutDuration: number;
  sessionTimeout: number;
  requireTwoFactor: boolean;
  allowedRoles: string[];
  ipWhitelist: string[];
  deviceTracking: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    walletAddress: string;
    role: string;
    permissions: string[];
    sessionId: string;
    deviceId?: string;
    lastActivity: Date;
  };
  session?: {
    id: string;
    userId: string;
    createdAt: Date;
    lastActivity: Date;
    ipAddress: string;
    userAgent: string;
    isValid: boolean;
  };
}

// Default configuration
const DEFAULT_AUTH_CONFIG: AuthSecurityConfig = {
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
  jwtExpiresIn: '1h',
  refreshTokenExpiresIn: '7d',
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  sessionTimeout: 60 * 60 * 1000, // 1 hour
  requireTwoFactor: false,
  allowedRoles: ['user', 'seller', 'admin', 'moderator'],
  ipWhitelist: [],
  deviceTracking: true
};

/**
 * Authentication Security Manager
 */
export class AuthenticationSecurityManager {
  private config: AuthSecurityConfig;
  private loginAttempts: Map<string, { count: number; lastAttempt: Date; lockedUntil?: Date }> = new Map();
  private activeSessions: Map<string, any> = new Map();
  private blacklistedTokens: Set<string> = new Set();

  constructor(config: Partial<AuthSecurityConfig> = {}) {
    this.config = { ...DEFAULT_AUTH_CONFIG, ...config };
  }

  /**
   * JWT Authentication Middleware
   */
  public createAuthMiddleware(options: { 
    required?: boolean; 
    roles?: string[]; 
    permissions?: string[] 
  } = {}) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { required = true, roles = [], permissions = [] } = options;

        // Extract token from header
        const token = this.extractToken(req);
        
        if (!token) {
          if (required) {
            return ApiResponse.unauthorized(res, 'Authentication token required');
          }
          return next();
        }

        // Check if token is blacklisted
        if (this.blacklistedTokens.has(token)) {
          return ApiResponse.unauthorized(res, 'Token has been revoked');
        }

        // Verify and decode token
        const decoded = await this.verifyToken(token);
        if (!decoded) {
          return ApiResponse.unauthorized(res, 'Invalid or expired token');
        }

        // Check session validity
        const session = this.activeSessions.get(decoded.sessionId);
        if (!session || !this.isSessionValid(session)) {
          return ApiResponse.unauthorized(res, 'Session expired or invalid');
        }

        // Update session activity
        session.lastActivity = new Date();
        this.activeSessions.set(decoded.sessionId, session);

        // Attach user info to request
        req.user = {
          id: decoded.userId,
          walletAddress: decoded.walletAddress,
          role: decoded.role,
          permissions: decoded.permissions || [],
          sessionId: decoded.sessionId,
          deviceId: decoded.deviceId,
          lastActivity: new Date()
        };

        req.session = session;

        // Role-based access control
        if (roles.length > 0 && !roles.includes(req.user.role)) {
          logger.warn('Access denied - insufficient role', {
            userId: req.user.id,
            userRole: req.user.role,
            requiredRoles: roles,
            path: req.path,
            method: req.method
          });
          return ApiResponse.forbidden(res, 'Insufficient permissions');
        }

        // Permission-based access control
        if (permissions.length > 0) {
          const hasPermission = permissions.some(permission => 
            req.user!.permissions.includes(permission)
          );
          
          if (!hasPermission) {
            logger.warn('Access denied - insufficient permissions', {
              userId: req.user.id,
              userPermissions: req.user.permissions,
              requiredPermissions: permissions,
              path: req.path,
              method: req.method
            });
            return ApiResponse.forbidden(res, 'Insufficient permissions');
          }
        }

        // Security checks
        if (!this.performSecurityChecks(req, session)) {
          return ApiResponse.forbidden(res, 'Security check failed');
        }

        next();
      } catch (error) {
        logger.error('Authentication middleware error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          path: req.path,
          method: req.method,
          ip: req.ip
        });
        
        return ApiResponse.unauthorized(res, 'Authentication failed');
      }
    };
  }

  /**
   * Extract token from request
   */
  private extractToken(req: Request): string | null {
    // Check Authorization header
    const authHeader = req.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check query parameter (less secure, for specific use cases)
    if (req.query.token && typeof req.query.token === 'string') {
      return req.query.token;
    }

    // Check cookie (if using cookie-based auth)
    if (req.cookies && req.cookies.authToken) {
      return req.cookies.authToken;
    }

    return null;
  }

  /**
   * Verify JWT token
   */
  private async verifyToken(token: string): Promise<any> {
    try {
      const decoded = jwt.verify(token, this.config.jwtSecret) as any;
      
      // Check token expiration
      if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        return null;
      }

      return decoded;
    } catch (error) {
      logger.warn('Token verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Check if session is valid
   */
  private isSessionValid(session: any): boolean {
    if (!session || !session.isValid) {
      return false;
    }

    // Check session timeout
    const now = Date.now();
    const lastActivity = new Date(session.lastActivity).getTime();
    
    if (now - lastActivity > this.config.sessionTimeout) {
      session.isValid = false;
      return false;
    }

    return true;
  }

  /**
   * Perform additional security checks
   */
  private performSecurityChecks(req: AuthenticatedRequest, session: any): boolean {
    // IP address validation
    if (this.config.ipWhitelist.length > 0) {
      const clientIP = req.ip || 'unknown';
      if (!this.config.ipWhitelist.includes(clientIP)) {
        logger.warn('Access denied - IP not whitelisted', {
          clientIP,
          userId: req.user?.id,
          path: req.path
        });
        return false;
      }
    }

    // Device tracking
    if (this.config.deviceTracking && session.userAgent) {
      const currentUserAgent = req.get('User-Agent') || '';
      if (session.userAgent !== currentUserAgent) {
        logger.warn('Suspicious activity - User agent mismatch', {
          userId: req.user?.id,
          sessionUserAgent: session.userAgent,
          currentUserAgent,
          path: req.path
        });
        // In production, you might want to invalidate the session
        // For now, we'll just log it
      }
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /admin|root|system/i, // Suspicious usernames in headers
      /script|javascript|eval/i, // Script injection attempts
    ];

    const headers = JSON.stringify(req.headers);
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(headers)) {
        logger.warn('Suspicious request pattern detected', {
          userId: req.user?.id,
          pattern: pattern.toString(),
          path: req.path,
          headers: req.headers
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Login attempt tracking middleware
   */
  public createLoginAttemptMiddleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const clientId = this.getClientIdentifier(req);
      const attempt = this.loginAttempts.get(clientId);

      // Check if client is locked out
      if (attempt && attempt.lockedUntil && new Date() < attempt.lockedUntil) {
        const remainingTime = Math.ceil((attempt.lockedUntil.getTime() - Date.now()) / 1000);
        logger.warn('Login attempt blocked - account locked', {
          clientId,
          remainingLockTime: remainingTime,
          ip: req.ip
        });
        
        return ApiResponse.tooManyRequests(res, `Account locked. Try again in ${remainingTime} seconds`);
      }

      next();
    };
  }

  /**
   * Record failed login attempt
   */
  public recordFailedLogin(req: Request): void {
    const clientId = this.getClientIdentifier(req);
    const attempt = this.loginAttempts.get(clientId) || { count: 0, lastAttempt: new Date() };

    attempt.count++;
    attempt.lastAttempt = new Date();

    // Lock account if max attempts reached
    if (attempt.count >= this.config.maxLoginAttempts) {
      attempt.lockedUntil = new Date(Date.now() + this.config.lockoutDuration);
      logger.warn('Account locked due to failed login attempts', {
        clientId,
        attempts: attempt.count,
        lockedUntil: attempt.lockedUntil,
        ip: req.ip
      });
    }

    this.loginAttempts.set(clientId, attempt);
  }

  /**
   * Record successful login
   */
  public recordSuccessfulLogin(req: Request, userId: string): string {
    const clientId = this.getClientIdentifier(req);
    
    // Clear failed attempts
    this.loginAttempts.delete(clientId);

    // Create session
    const sessionId = this.generateSessionId();
    const session = {
      id: sessionId,
      userId,
      createdAt: new Date(),
      lastActivity: new Date(),
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      isValid: true
    };

    this.activeSessions.set(sessionId, session);

    logger.info('Successful login', {
      userId,
      sessionId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    return sessionId;
  }

  /**
   * Generate JWT token
   */
  public generateToken(payload: any): string {
    return jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: this.config.jwtExpiresIn
    });
  }

  /**
   * Invalidate session
   */
  public invalidateSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.isValid = false;
      this.activeSessions.delete(sessionId);
      
      logger.info('Session invalidated', { sessionId });
    }
  }

  /**
   * Blacklist token
   */
  public blacklistToken(token: string): void {
    this.blacklistedTokens.add(token);
    
    // Clean up old blacklisted tokens periodically
    if (this.blacklistedTokens.size > 10000) {
      // In production, you'd want a more sophisticated cleanup mechanism
      this.blacklistedTokens.clear();
    }
  }

  /**
   * Get client identifier for rate limiting
   */
  private getClientIdentifier(req: Request): string {
    // Combine IP and User-Agent for more accurate identification
    const ip = req.ip || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    return crypto.createHash('sha256').update(`${ip}:${userAgent}`).digest('hex');
  }

  /**
   * Generate secure session ID
   */
  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Clean up expired sessions
   */
  public cleanupExpiredSessions(): void {
    const now = Date.now();
    
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (!this.isSessionValid(session)) {
        this.activeSessions.delete(sessionId);
      }
    }

    // Clean up old login attempts
    for (const [clientId, attempt] of this.loginAttempts.entries()) {
      if (attempt.lockedUntil && now > attempt.lockedUntil.getTime()) {
        this.loginAttempts.delete(clientId);
      }
    }
  }

  /**
   * Get active sessions count
   */
  public getActiveSessionsCount(): number {
    return this.activeSessions.size;
  }

  /**
   * Get failed login attempts count
   */
  public getFailedAttemptsCount(): number {
    return this.loginAttempts.size;
  }
}

// Create default instance
export const authSecurityManager = new AuthenticationSecurityManager();

// Export pre-configured middleware
export const authMiddleware = authSecurityManager.createAuthMiddleware({ required: true });
export const optionalAuthMiddleware = authSecurityManager.createAuthMiddleware({ required: false });
export const adminAuthMiddleware = authSecurityManager.createAuthMiddleware({ 
  required: true, 
  roles: ['admin'] 
});
export const sellerAuthMiddleware = authSecurityManager.createAuthMiddleware({ 
  required: true, 
  roles: ['seller', 'admin'] 
});
export const loginAttemptMiddleware = authSecurityManager.createLoginAttemptMiddleware();

// Cleanup expired sessions every 5 minutes
setInterval(() => {
  authSecurityManager.cleanupExpiredSessions();
}, 5 * 60 * 1000);

export default {
  AuthenticationSecurityManager,
  authSecurityManager,
  authMiddleware,
  optionalAuthMiddleware,
  adminAuthMiddleware,
  sellerAuthMiddleware,
  loginAttemptMiddleware
};