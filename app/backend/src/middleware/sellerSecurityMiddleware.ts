/**
 * Seller Security Middleware
 * 
 * Express middleware for seller-specific security controls including
 * authentication, authorization, rate limiting, and audit logging.
 */

import { Request, Response, NextFunction } from 'express';
import { safeLogger } from '../utils/safeLogger';
import SellerSecurityService, { SellerRole, SellerAccessRequest } from '../services/marketplace/sellerSecurityService';
import { securityMonitoringService } from '../services/securityMonitoringService';
import { SecurityEventType, SecuritySeverity } from '../services/securityMonitoringService';
import { errorResponse, validationErrorResponse } from '../utils/apiResponse';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      sellerSecurity?: {
        walletAddress: string;
        role: SellerRole;
        sessionId: string;
        permissions: string[];
      };
    }
  }
}

class SellerSecurityMiddleware {
  private sellerSecurityService: SellerSecurityService;
  private securityMonitoring: typeof securityMonitoringService;

  constructor() {
    this.sellerSecurityService = new SellerSecurityService();
    this.securityMonitoring = securityMonitoringService;
  }

  /**
   * Validate seller access for protected routes
   */
  validateSellerAccess = (requiredData: string[] = []) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const walletAddress = req.params.walletAddress || req.body.walletAddress || req.query.walletAddress;
        const requestorAddress = req.headers['x-wallet-address'] as string;
        const sessionId = req.headers['x-session-id'] as string;

        if (!walletAddress) {
          return validationErrorResponse(res, [{ field: 'walletAddress', message: 'Wallet address is required' }]);
        }

        // Create access request
        const accessRequest: SellerAccessRequest = {
          walletAddress: walletAddress as string,
          requestedData: requiredData,
          requestorAddress,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date()
        };

        // Validate access
        const isValid = await this.sellerSecurityService.validateSellerAccess(accessRequest);
        
        if (!isValid) {
          await this.securityMonitoring.recordSecurityEvent({
            type: 'AUTHORIZATION_VIOLATION',
            severity: SecuritySeverity.MEDIUM,
            source: 'seller_security_middleware',
            userId: requestorAddress || walletAddress as string,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            details: {
              route: req.path,
              method: req.method,
              requiredData,
              reason: 'access_validation_failed'
            }
          });

          return errorResponse(res, 'ACCESS_DENIED', 'Access denied', 403);
        }

        // Validate session if provided
        if (sessionId) {
          const sessionContext = await this.sellerSecurityService.validateSecuritySession(sessionId);
          if (sessionContext) {
            req.sellerSecurity = {
              walletAddress: sessionContext.walletAddress,
              role: sessionContext.role,
              sessionId: sessionContext.sessionId,
              permissions: sessionContext.permissions.flatMap(p => p.actions)
            };
          }
        }

        next();
      } catch (error) {
        safeLogger.error('Seller security validation error:', error);
        
        await this.securityMonitoring.recordSecurityEvent({
          type: 'SYSTEM_INTRUSION',
          severity: SecuritySeverity.HIGH,
          source: 'seller_security_middleware',
          userId: req.headers['x-wallet-address'] as string,
          ipAddress: req.ip,
          details: { error: error.message, route: req.path }
        });

        return errorResponse(res, 'SECURITY_VALIDATION_FAILED', 'Security validation failed', 500);
      }
    };
  };

  /**
   * Require wallet ownership verification
   */
  requireWalletOwnership = () => {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { walletAddress, signature, message, timestamp, nonce } = req.body;

        if (!walletAddress || !signature || !message || !timestamp || !nonce) {
          return validationErrorResponse(res, [{ field: 'walletVerification', message: 'Wallet ownership verification data is required' }]);
        }

        const verification = {
          walletAddress,
          signature,
          message,
          timestamp: parseInt(timestamp),
          nonce
        };

        const isValid = await this.sellerSecurityService.verifyWalletOwnership(verification);
        
        if (!isValid) {
          await this.securityMonitoring.recordSecurityEvent({
            type: 'AUTHENTICATION_FAILURE',
            severity: SecuritySeverity.HIGH,
            source: 'seller_security_middleware',
            userId: walletAddress,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            details: {
              route: req.path,
              reason: 'wallet_ownership_verification_failed'
            }
          });

          return errorResponse(res, 'WALLET_OWNERSHIP_VERIFICATION_FAILED', 'Wallet ownership verification failed', 401);
        }

        next();
      } catch (error) {
        safeLogger.error('Wallet ownership verification error:', error);
        return errorResponse(res, 'VERIFICATION_FAILED', 'Verification failed', 500);
      }
    };
  };

  /**
   * Require specific seller role
   */
  requireSellerRole = (requiredRole: SellerRole) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.sellerSecurity) {
          return errorResponse(res, 'SECURITY_CONTEXT_NOT_FOUND', 'Security context not found', 401);
        }

        const userRole = req.sellerSecurity.role;
        const roleHierarchy = {
          [SellerRole.VIEWER]: 1,
          [SellerRole.MODERATOR]: 2,
          [SellerRole.ADMIN]: 3,
          [SellerRole.OWNER]: 4,
          [SellerRole.SYSTEM]: 5
        };

        if (roleHierarchy[userRole] < roleHierarchy[requiredRole]) {
          await this.securityMonitoring.recordSecurityEvent({
            type: 'AUTHORIZATION_VIOLATION',
            severity: SecuritySeverity.MEDIUM,
            source: 'seller_security_middleware',
            userId: req.sellerSecurity.walletAddress,
            ipAddress: req.ip,
            details: {
              route: req.path,
              userRole,
              requiredRole,
              reason: 'insufficient_role'
            }
          });

          return errorResponse(res, 'INSUFFICIENT_PERMISSIONS', 'Insufficient permissions', 403);
        }

        next();
      } catch (error) {
        safeLogger.error('Role validation error:', error);
        
        await this.securityMonitoring.recordSecurityEvent({
          type: 'SYSTEM_INTRUSION',
          severity: SecuritySeverity.HIGH,
          source: 'seller_security_middleware',
          userId: req.sellerSecurity?.walletAddress,
          ipAddress: req.ip,
          details: { error: error.message, route: req.path }
        });

        return errorResponse(res, 'ROLE_VALIDATION_FAILED', 'Role validation failed', 500);
      }
    };
  };

  /**
   * Sanitize seller data in responses
   */
  sanitizeSellerResponse = (context: 'storage' | 'transmission' | 'logging' = 'transmission') => {
    return async (req: Request, res: Response, next: NextFunction) => {
      const originalSend = res.send;

      res.send = async function(data: any) {
        try {
          if (data && typeof data === 'object') {
            const sanitized = await this.sellerSecurityService.sanitizeSellerData(data, context);
            return originalSend.call(this, sanitized);
          }
          return originalSend.call(this, data);
        } catch (error) {
          safeLogger.error('Response sanitization error:', error);
          return originalSend.call(this, data);
        }
      }.bind({ sellerSecurityService: this.sellerSecurityService });

      next();
    };
  };

  /**
   * Rate limiting for seller operations
   */
  sellerRateLimit = (maxRequests: number = 100, windowMs: number = 900000) => {
    const requestCounts = new Map<string, { count: number; resetTime: number }>();

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const walletAddress = req.params.walletAddress || req.body.walletAddress || req.query.walletAddress;
        const key = `seller_${walletAddress}_${req.ip}`;
        const now = Date.now();

        let requestData = requestCounts.get(key);
        
        if (!requestData || now > requestData.resetTime) {
          requestData = { count: 0, resetTime: now + windowMs };
        }

        requestData.count++;
        requestCounts.set(key, requestData);

        if (requestData.count > maxRequests) {
          await this.securityMonitoring.recordSecurityEvent({
            type: 'UNUSUAL_ACTIVITY',
            severity: SecuritySeverity.MEDIUM,
            source: 'seller_security_middleware',
            userId: walletAddress as string,
            ipAddress: req.ip,
            details: {
              route: req.path,
              requestCount: requestData.count,
              maxRequests,
              windowMs
            }
          });

          return errorResponse(res, 'RATE_LIMIT_EXCEEDED', 'Rate limit exceeded', 429);
        }

        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': Math.max(0, maxRequests - requestData.count).toString(),
          'X-RateLimit-Reset': new Date(requestData.resetTime).toISOString()
        });

        next();
      } catch (error) {
        safeLogger.error('Rate limiting error:', error);
        next();
      }
    };
  };

  /**
   * Audit logging for seller operations
   */
  auditSellerOperation = (eventType: string, resource: string, action: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      const originalSend = res.send;
      const startTime = Date.now();

      res.send = async function(data: any) {
        try {
          const walletAddress = req.params.walletAddress || req.body.walletAddress || req.query.walletAddress;
          const duration = Date.now() - startTime;

          await this.sellerSecurityService.logSellerAuditEvent({
            eventType,
            walletAddress: walletAddress as string,
            actorAddress: req.headers['x-wallet-address'] as string,
            resource,
            action,
            oldState: req.body.oldState,
            newState: res.statusCode < 400 ? data : undefined,
            metadata: {
              method: req.method,
              path: req.path,
              statusCode: res.statusCode,
              duration,
              userAgent: req.get('User-Agent')
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date()
          });
        } catch (error) {
          safeLogger.error('Audit logging error:', error);
        }

        return originalSend.call(this, data);
      }.bind({ sellerSecurityService: this.sellerSecurityService });

      next();
    };
  };

  /**
   * Generate verification nonce endpoint
   */
  generateVerificationNonce = async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.body;

      if (!walletAddress) {
        return validationErrorResponse(res, [{ field: 'walletAddress', message: 'Wallet address is required' }]);
      }

      const nonce = this.sellerSecurityService.generateVerificationNonce(walletAddress);

      res.json({
        success: true,
        data: {
          nonce,
          message: `Please sign this message to verify ownership of wallet ${walletAddress}`,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      safeLogger.error('Error generating verification nonce:', error);
      return errorResponse(res, 'FAILED_TO_GENERATE_VERIFICATION_NONCE', 'Failed to generate verification nonce', 500);
    }
  };

  /**
   * Create security session endpoint
   */
  createSecuritySession = async (req: Request, res: Response) => {
    try {
      const { walletAddress, role = SellerRole.OWNER } = req.body;

      if (!walletAddress) {
        return validationErrorResponse(res, [{ field: 'walletAddress', message: 'Wallet address is required' }]);
      }

      const sessionId = await this.sellerSecurityService.createSecuritySession(
        walletAddress,
        role,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        data: {
          sessionId,
          expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour
        }
      });
    } catch (error) {
      safeLogger.error('Error creating security session:', error);
      return errorResponse(res, 'FAILED_TO_CREATE_SECURITY_SESSION', 'Failed to create security session', 500);
    }
  };

  /**
   * Revoke security session endpoint
   */
  revokeSecuritySession = async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.body;

      if (!sessionId) {
        return validationErrorResponse(res, [{ field: 'sessionId', message: 'Session ID is required' }]);
      }

      const success = await this.sellerSecurityService.revokeSecuritySession(sessionId);

      res.json({
        success,
        message: success ? 'Session revoked successfully' : 'Session not found'
      });
    } catch (error) {
      safeLogger.error('Error revoking security session:', error);
      return errorResponse(res, 'FAILED_TO_REVOKE_SECURITY_SESSION', 'Failed to revoke security session', 500);
    }
  };
}

export default SellerSecurityMiddleware;
