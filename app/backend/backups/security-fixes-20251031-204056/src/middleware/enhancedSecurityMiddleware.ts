import { Request, Response, NextFunction } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { AuthenticatedRequest } from './adminAuthMiddleware';
import { safeLogger } from '../utils/safeLogger';
import crypto from 'crypto';
import { safeLogger } from '../utils/safeLogger';

interface MFASession {
  userId: string;
  verified: boolean;
  verifiedAt: Date;
  deviceFingerprint: string;
}

interface SensitiveAction {
  requiresReauth: boolean;
  reauthWindow: number; // Minutes
  logLevel: 'high' | 'critical';
}

// Store MFA sessions (in production, use Redis)
const mfaSessions = new Map<string, MFASession>();

// Store recent authentication timestamps
const authTimestamps = new Map<string, Date>();

// Sensitive actions that require re-authentication
const SENSITIVE_ACTIONS: Record<string, SensitiveAction> = {
  'DELETE /api/admin/users/:id': {
    requiresReauth: true,
    reauthWindow: 5,
    logLevel: 'critical',
  },
  'POST /api/admin/users/:id/ban': {
    requiresReauth: true,
    reauthWindow: 5,
    logLevel: 'critical',
  },
  'PUT /api/admin/users/:id/role': {
    requiresReauth: true,
    reauthWindow: 10,
    logLevel: 'high',
  },
  'DELETE /api/admin/moderation/:id': {
    requiresReauth: true,
    reauthWindow: 10,
    logLevel: 'high',
  },
  'POST /api/admin/workflows/:id/execute': {
    requiresReauth: false,
    reauthWindow: 30,
    logLevel: 'high',
  },
};

/**
 * Enhanced MFA enforcement middleware for admin users
 */
export const enforceMFA = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    // Check if user is admin
    const adminRoles = ['super_admin', 'admin', 'moderator'];
    if (!adminRoles.includes(user.role)) {
      return next(); // Not an admin, skip MFA check
    }

    // Get device fingerprint
    const deviceFingerprint = generateDeviceFingerprint(req);
    const sessionKey = `${user.id}:${deviceFingerprint}`;

    // Check if MFA is verified for this session
    const session = mfaSessions.get(sessionKey);
    
    if (!session || !session.verified) {
      res.status(403).json({
        success: false,
        error: 'MFA_REQUIRED',
        message: 'Multi-factor authentication is required for admin accounts',
        details: {
          userId: user.id,
          requireMFA: true,
        },
      });
      return;
    }

    // Check session age (MFA sessions expire after 24 hours)
    const sessionAge = Date.now() - session.verifiedAt.getTime();
    const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (sessionAge > maxSessionAge) {
      mfaSessions.delete(sessionKey);
      res.status(403).json({
        success: false,
        error: 'MFA_EXPIRED',
        message: 'MFA session expired, please re-authenticate',
      });
      return;
    }

    next();
  } catch (error) {
    safeLogger.error('MFA enforcement error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal error during MFA verification',
    });
  }
};

/**
 * Verify MFA token (called during login)
 */
export async function verifyMFAToken(
  userId: string,
  token: string,
  deviceFingerprint: string
): Promise<boolean> {
  // In production, verify TOTP token using authenticator library
  // For now, simulate verification
  const isValid = token.length === 6 && /^\d+$/.test(token);
  
  if (isValid) {
    const sessionKey = `${userId}:${deviceFingerprint}`;
    mfaSessions.set(sessionKey, {
      userId,
      verified: true,
      verifiedAt: new Date(),
      deviceFingerprint,
    });
  }
  
  return isValid;
}

/**
 * Require re-authentication for sensitive operations
 */
export const requireReauth = (actionKey?: string) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.user;
      
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Determine if this action requires reauth
      const action = actionKey || `${req.method} ${req.route?.path || req.path}`;
      const sensitiveAction = SENSITIVE_ACTIONS[action];
      
      if (!sensitiveAction || !sensitiveAction.requiresReauth) {
        return next(); // Not a sensitive action
      }

      // Check last authentication time
      const lastAuth = authTimestamps.get(user.id);
      
      if (!lastAuth) {
        res.status(403).json({
          success: false,
          error: 'REAUTH_REQUIRED',
          message: 'Re-authentication required for this sensitive operation',
          details: {
            action,
            reauthWindow: sensitiveAction.reauthWindow,
          },
        });
        return;
      }

      // Check if reauth window has expired
      const timeSinceAuth = Date.now() - lastAuth.getTime();
      const reauthWindow = sensitiveAction.reauthWindow * 60 * 1000; // Convert to ms
      
      if (timeSinceAuth > reauthWindow) {
        res.status(403).json({
          success: false,
          error: 'REAUTH_REQUIRED',
          message: `Please re-authenticate. This action requires authentication within ${sensitiveAction.reauthWindow} minutes`,
          details: {
            action,
            reauthWindow: sensitiveAction.reauthWindow,
            timeSinceAuth: Math.floor(timeSinceAuth / 60000), // minutes
          },
        });
        return;
      }

      // Log sensitive action
      await logSensitiveAction(user.id, action, sensitiveAction.logLevel, req);

      next();
    } catch (error) {
      safeLogger.error('Reauth middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal error during reauth verification',
      });
    }
  };
};

/**
 * Update authentication timestamp (called after successful login/reauth)
 */
export function updateAuthTimestamp(userId: string): void {
  authTimestamps.set(userId, new Date());
}

/**
 * Enhanced audit logging with anomaly detection
 */
async function logSensitiveAction(
  userId: string,
  action: string,
  level: 'high' | 'critical',
  req: Request
): Promise<void> {
  const logEntry = {
    userId,
    action,
    level,
    timestamp: new Date().toISOString(),
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('User-Agent'),
    method: req.method,
    path: req.path,
    body: sanitizeLogData(req.body),
    query: req.query,
  };

  // In production, send to logging service
  safeLogger.info('[SENSITIVE_ACTION]', JSON.stringify(logEntry));

  // Check for anomalies
  await detectAnomalies(userId, action);
}

/**
 * Detect anomalous admin behavior
 */
async function detectAnomalies(userId: string, action: string): Promise<void> {
  // Track action frequency
  const recentActions = await getRecentActions(userId, 5); // Last 5 minutes
  
  // Anomaly: Too many sensitive actions in short time
  if (recentActions.length > 10) {
    await sendAnomalyAlert(userId, 'HIGH_ACTION_FREQUENCY', {
      actionCount: recentActions.length,
      timeWindow: '5 minutes',
    });
  }

  // Anomaly: Unusual action pattern (e.g., bulk deletions)
  if (action.includes('DELETE') && recentActions.filter(a => a.includes('DELETE')).length > 5) {
    await sendAnomalyAlert(userId, 'BULK_DELETION_PATTERN', {
      deleteCount: recentActions.filter(a => a.includes('DELETE')).length,
    });
  }

  // Anomaly: Access from new location/device
  // (Would implement with IP geolocation and device fingerprinting)
}

/**
 * Get recent actions for user (mock implementation)
 */
async function getRecentActions(userId: string, minutes: number): Promise<string[]> {
  // In production, query from audit log database
  return [];
}

/**
 * Send anomaly alert to security team
 */
async function sendAnomalyAlert(
  userId: string,
  anomalyType: string,
  details: any
): Promise<void> {
  safeLogger.warn('[SECURITY_ANOMALY]', {
    userId,
    anomalyType,
    details,
    timestamp: new Date().toISOString(),
  });

  // In production:
  // - Send alert to security team via email/Slack
  // - Create security incident ticket
  // - Potentially suspend user account pending review
}

/**
 * Generate device fingerprint
 */
function generateDeviceFingerprint(req: Request): string {
  const components = [
    req.ip || req.socket.remoteAddress || 'unknown',
    req.get('User-Agent') || 'unknown',
    req.get('Accept-Language') || 'unknown',
  ];
  
  return crypto
    .createHash('sha256')
    .update(components.join('|'))
    .digest('hex')
    .substring(0, 16);
}

/**
 * Sanitize sensitive data from logs
 */
function sanitizeLogData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = { ...data };
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'mfaCode'];
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * IP rate limiting for admin operations
 */
export const adminIPRateLimit = () => {
  const ipRequests = new Map<string, { count: number; resetTime: number }>();
  const maxRequests = 100; // per window
  const windowMs = 15 * 60 * 1000; // 15 minutes

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Clean up old entries
    for (const [storedIp, data] of Array.from(ipRequests.entries())) {
      if (data.resetTime < now) {
        ipRequests.delete(storedIp);
      }
    }
    
    const requestData = ipRequests.get(ip);
    
    if (!requestData) {
      ipRequests.set(ip, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }
    
    if (requestData.resetTime < now) {
      // Reset window
      ipRequests.set(ip, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }
    
    if (requestData.count >= maxRequests) {
      res.status(429).json({
        success: false,
        error: 'Too many requests from this IP',
        retryAfter: Math.ceil((requestData.resetTime - now) / 1000),
      });
      return;
    }
    
    requestData.count++;
    next();
  };
};

/**
 * Session validation with additional security checks
 */
export const validateSecureSession = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const user = req.user;
  
  if (!user) {
    res.status(401).json({
      success: false,
      error: 'Invalid session',
    });
    return;
  }

  // Validate session hasn't been compromised
  const currentFingerprint = generateDeviceFingerprint(req);
  const storedFingerprint = req.get('X-Device-Fingerprint');
  
  if (storedFingerprint && currentFingerprint !== storedFingerprint) {
    safeLogger.warn('[SECURITY] Device fingerprint mismatch', {
      userId: user.id,
      expected: storedFingerprint,
      actual: currentFingerprint,
    });
    
    res.status(403).json({
      success: false,
      error: 'Session validation failed',
      message: 'Please re-authenticate',
    });
    return;
  }

  next();
};

// Export combined security middleware stack
export const enhancedSecurityStack = [
  adminIPRateLimit(),
  enforceMFA,
  validateSecureSession,
];
