import { Request, Response, NextFunction } from 'express';
import { safeLogger } from '../utils/safeLogger';

interface AuthLogEntry {
    timestamp: string;
    method: string;
    path: string;
    hasAuthHeader: boolean;
    tokenPrefix?: string;
    userAddress?: string;
    userId?: string;
    statusCode?: number;
    errorCode?: string;
    duration?: number;
}

/**
 * Authentication logging middleware
 * Logs all authentication-related requests for debugging
 */
export const authLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    // Only log auth-related endpoints
    const isAuthEndpoint = req.path.startsWith('/api/auth') ||
        req.path.startsWith('/api/admin') ||
        req.path.includes('/profile') ||
        req.path.includes('/user');

    if (!isAuthEndpoint) {
        return next();
    }

    const startTime = Date.now();
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    const logEntry: AuthLogEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        hasAuthHeader: !!authHeader,
        tokenPrefix: token ? token.substring(0, 20) + '...' : undefined
    };

    // Capture original res.json to log response
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
        logEntry.statusCode = res.statusCode;
        logEntry.duration = Date.now() - startTime;

        // Extract error code if present
        if (body && typeof body === 'object') {
            logEntry.errorCode = body.code || body.error;
        }

        // Log the request
        if (res.statusCode >= 400) {
            safeLogger.warn('[AuthLog] Request failed:', logEntry);
        } else {
            safeLogger.info('[AuthLog] Request succeeded:', logEntry);
        }

        return originalJson(body);
    };

    // Capture user info from request if available
    const user = (req as any).user;
    if (user) {
        logEntry.userAddress = user.address || user.walletAddress;
        logEntry.userId = user.id || user.userId;
    }

    next();
};

/**
 * Detailed authentication error logger
 * Logs authentication failures with context
 */
export const logAuthError = (
    req: Request,
    errorCode: string,
    errorMessage: string,
    additionalContext?: Record<string, any>
): void => {
    safeLogger.error('[AuthError]', {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        errorCode,
        errorMessage,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        ...additionalContext
    });
};

/**
 * Log successful authentication
 */
export const logAuthSuccess = (
    req: Request,
    userId: string,
    userAddress: string,
    additionalContext?: Record<string, any>
): void => {
    safeLogger.info('[AuthSuccess]', {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        userId,
        userAddress,
        ip: req.ip,
        ...additionalContext
    });
};
