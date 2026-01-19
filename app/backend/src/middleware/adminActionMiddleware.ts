/**
 * Admin Action Middleware
 * Provides enhanced security and audit logging for admin operations
 */

import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/apiResponse';
import { safeLogger } from '../utils/safeLogger';
import { RedisService } from '../services/redisService';

const redisService = RedisService.getInstance();

// Time-delayed operations that require additional confirmation
const TIME_DELAYED_OPERATIONS = [
    'DELETE /api/admin/users/:id',
    'POST /api/admin/users/:id/ban',
    'DELETE /api/admin/content/:id',
    'POST /api/admin/system/reset'
];

// Critical operations that require extra logging
const CRITICAL_OPERATIONS = [
    ...TIME_DELAYED_OPERATIONS,
    'PUT /api/admin/users/:id/role',
    'POST /api/admin/permissions',
    'DELETE /api/admin/permissions',
    'PUT /api/admin/settings'
];

interface AdminActionLog {
    adminId: string;
    adminAddress: string;
    action: string;
    method: string;
    path: string;
    body?: any;
    query?: any;
    params?: any;
    timestamp: number;
    ip: string;
    userAgent: string;
}

/**
 * Log admin action for audit trail
 */
async function logAdminAction(req: Request): Promise<void> {
    const user = (req as any).user;

    const logEntry: AdminActionLog = {
        adminId: user?.id || 'unknown',
        adminAddress: user?.walletAddress || 'unknown',
        action: `${req.method} ${req.path}`,
        method: req.method,
        path: req.path,
        body: sanitizeLogData(req.body),
        query: req.query,
        params: req.params,
        timestamp: Date.now(),
        ip: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown'
    };

    // Log to console
    safeLogger.info('[AdminAction]', logEntry);

    // Store in Redis for audit trail (keep for 90 days)
    try {
        const key = `admin:action:${logEntry.timestamp}:${logEntry.adminId}`;
        await redisService.set(key, logEntry, 90 * 24 * 60 * 60);

        // Also add to admin's action list
        const userActionsKey = `admin:actions:${logEntry.adminId}`;
        const userActions = await redisService.get(userActionsKey) || [];
        userActions.push({
            action: logEntry.action,
            timestamp: logEntry.timestamp,
            path: logEntry.path
        });

        // Keep last 1000 actions
        if (userActions.length > 1000) {
            userActions.shift();
        }

        await redisService.set(userActionsKey, userActions, 90 * 24 * 60 * 60);
    } catch (error) {
        safeLogger.error('[AdminAction] Failed to store audit log:', error);
    }
}

/**
 * Sanitize sensitive data from logs
 */
function sanitizeLogData(data: any): any {
    if (!data) return data;

    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'privateKey'];

    for (const field of sensitiveFields) {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    }

    return sanitized;
}

/**
 * Check if operation is time-delayed
 */
function isTimeDelayedOperation(method: string, path: string): boolean {
    const operation = `${method} ${path}`;
    return TIME_DELAYED_OPERATIONS.some(delayed => {
        const pattern = delayed.replace(/:[^/]+/g, '[^/]+');
        return new RegExp(`^${pattern}$`).test(operation);
    });
}

/**
 * Check if operation is critical
 */
function isCriticalOperation(method: string, path: string): boolean {
    const operation = `${method} ${path}`;
    return CRITICAL_OPERATIONS.some(critical => {
        const pattern = critical.replace(/:[^/]+/g, '[^/]+');
        return new RegExp(`^${pattern}$`).test(operation);
    });
}

/**
 * Middleware to verify admin permissions
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    const user = (req as any).user;

    if (!user) {
        ApiResponse.unauthorized(res, 'Authentication required');
        return;
    }

    if (!user.isAdmin) {
        safeLogger.warn(`[AdminAction] Non-admin user attempted admin action: ${user.id}`);
        ApiResponse.forbidden(res, 'Admin access required');
        return;
    }

    next();
}

/**
 * Middleware to log admin actions
 */
export async function logAdminActionMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    const user = (req as any).user;

    if (user?.isAdmin) {
        await logAdminAction(req);
    }

    next();
}

/**
 * Middleware for time-delayed admin operations
 */
export async function timeDelayedOperation(req: Request, res: Response, next: NextFunction): Promise<void> {
    const user = (req as any).user;

    if (!isTimeDelayedOperation(req.method, req.path)) {
        return next();
    }

    // Check if confirmation token is provided
    const confirmationToken = req.headers['x-admin-confirmation'] as string;

    if (!confirmationToken) {
        // Generate confirmation token
        const token = `confirm_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const key = `admin:confirm:${token}`;

        await redisService.set(key, {
            adminId: user.id,
            action: `${req.method} ${req.path}`,
            body: req.body,
            createdAt: Date.now()
        }, 300); // 5 minutes to confirm

        res.status(202).json({
            success: false,
            requiresConfirmation: true,
            confirmationToken: token,
            message: 'This is a critical operation. Please confirm by including the X-Admin-Confirmation header with the provided token.',
            expiresIn: 300
        });
        return;
    }

    // Verify confirmation token
    const key = `admin:confirm:${confirmationToken}`;
    const confirmation = await redisService.get(key);

    if (!confirmation) {
        ApiResponse.badRequest(res, 'Invalid or expired confirmation token');
        return;
    }

    if (confirmation.adminId !== user.id) {
        ApiResponse.forbidden(res, 'Confirmation token does not match current user');
        return;
    }

    // Delete confirmation token (one-time use)
    await redisService.del(key);

    safeLogger.info(`[AdminAction] Confirmed time-delayed operation: ${confirmation.action}`);
    next();
}

/**
 * Middleware for critical operation warnings
 */
export async function criticalOperationWarning(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (isCriticalOperation(req.method, req.path)) {
        const user = (req as any).user;
        safeLogger.warn(`[AdminAction] CRITICAL OPERATION: ${req.method} ${req.path} by ${user?.id}`);
    }

    next();
}

/**
 * Get admin action history
 */
export async function getAdminActionHistory(adminId: string, limit: number = 100): Promise<any[]> {
    try {
        const userActionsKey = `admin:actions:${adminId}`;
        const actions = await redisService.get(userActionsKey) || [];

        return actions.slice(-limit).reverse();
    } catch (error) {
        safeLogger.error('[AdminAction] Failed to get action history:', error);
        return [];
    }
}

/**
 * Get all recent admin actions (for audit dashboard)
 */
export async function getAllRecentAdminActions(limit: number = 100): Promise<any[]> {
    try {
        const keys = await redisService.keys('admin:action:*');
        const recentKeys = keys.sort().reverse().slice(0, limit);

        const actions = [];
        for (const key of recentKeys) {
            const action = await redisService.get(key);
            if (action) {
                actions.push(action);
            }
        }

        return actions;
    } catch (error) {
        safeLogger.error('[AdminAction] Failed to get recent actions:', error);
        return [];
    }
}
