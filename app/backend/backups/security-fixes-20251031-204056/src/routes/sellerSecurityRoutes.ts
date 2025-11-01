/**
 * Seller Security Routes
 * 
 * API routes for seller security operations including wallet verification,
 * session management, and security monitoring.
 */

import { Router } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { safeLogger } from '../utils/safeLogger';
import SellerSecurityMiddleware from '../middleware/sellerSecurityMiddleware';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { safeLogger } from '../utils/safeLogger';
import { rateLimitingMiddleware } from '../middleware/rateLimitingMiddleware';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { safeLogger } from '../utils/safeLogger';
import { validationErrorResponse } from '../utils/apiResponse';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { safeLogger } from '../utils/safeLogger';

const router = Router();
const sellerSecurityMiddleware = new SellerSecurityMiddleware();

/**
 * @route POST /api/seller/security/nonce
 * @desc Generate verification nonce for wallet ownership
 * @access Public
 */
router.post('/nonce', csrfProtection,  
  rateLimitingMiddleware({ maxRequests: 10, windowMs: 60000 }), // 10 requests per minute
  sellerSecurityMiddleware.generateVerificationNonce
);

/**
 * @route POST /api/seller/security/verify
 * @desc Verify wallet ownership with signature
 * @access Public
 */
router.post('/verify', csrfProtection, 
  rateLimitingMiddleware({ maxRequests: 5, windowMs: 60000 }), // 5 requests per minute
  sellerSecurityMiddleware.requireWalletOwnership(),
  (req, res) => {
    res.json({
      success: true,
      message: 'Wallet ownership verified successfully'
    });
  }
);

/**
 * @route POST /api/seller/security/session
 * @desc Create security session
 * @access Protected
 */
router.post('/session', csrfProtection, 
  rateLimitingMiddleware({ maxRequests: 20, windowMs: 300000 }), // 20 requests per 5 minutes
  sellerSecurityMiddleware.requireWalletOwnership(),
  sellerSecurityMiddleware.createSecuritySession
);

/**
 * @route DELETE /api/seller/security/session
 * @desc Revoke security session
 * @access Protected
 */
router.delete('/session', csrfProtection, 
  rateLimitingMiddleware({ maxRequests: 50, windowMs: 300000 }), // 50 requests per 5 minutes
  sellerSecurityMiddleware.revokeSecuritySession
);

/**
 * @route GET /api/seller/security/status/:walletAddress
 * @desc Get security status for seller
 * @access Protected
 */
router.get('/status/:walletAddress',
  rateLimitingMiddleware({ maxRequests: 100, windowMs: 300000 }), // 100 requests per 5 minutes
  sellerSecurityMiddleware.validateSellerAccess(['profile', 'security']),
  async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      // Return security status information
      res.json({
        success: true,
        data: {
          walletAddress,
          securityLevel: 'high',
          lastVerification: new Date().toISOString(),
          activeSession: !!req.sellerSecurity?.sessionId,
          permissions: req.sellerSecurity?.permissions || [],
          role: req.sellerSecurity?.role || 'viewer'
        }
      });
    } catch (error) {
      safeLogger.error('Error getting security status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get security status'
      });
    }
  }
);

/**
 * @route GET /api/seller/security/audit/:walletAddress
 * @desc Get audit logs for seller
 * @access Protected - Owner/Admin only
 */
router.get('/audit/:walletAddress',
  rateLimitingMiddleware({ maxRequests: 50, windowMs: 300000 }), // 50 requests per 5 minutes
  sellerSecurityMiddleware.validateSellerAccess(['audit']),
  async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const { limit = 50, offset = 0, eventType } = req.query;
      
      // In a real implementation, this would query the audit logs
      // For now, return a mock response
      res.json({
        success: true,
        data: {
          auditLogs: [],
          pagination: {
            total: 0,
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            hasMore: false
          }
        }
      });
    } catch (error) {
      safeLogger.error('Error getting audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get audit logs'
      });
    }
  }
);

/**
 * @route POST /api/seller/security/permissions/:walletAddress
 * @desc Update seller permissions (Owner only)
 * @access Protected - Owner only
 */
router.post('/permissions/:walletAddress', csrfProtection, 
  rateLimitingMiddleware({ maxRequests: 10, windowMs: 300000 }), // 10 requests per 5 minutes
  sellerSecurityMiddleware.validateSellerAccess(['permissions']),
  sellerSecurityMiddleware.auditSellerOperation('permission_update', 'permissions', 'update'),
  async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const { targetAddress, role, permissions } = req.body;

      if (!targetAddress || !role) {
        return validationErrorResponse(res, 'Target address and role are required');
      }

      // In a real implementation, this would update permissions in the database
      res.json({
        success: true,
        message: 'Permissions updated successfully',
        data: {
          targetAddress,
          role,
          permissions: permissions || []
        }
      });
    } catch (error) {
      safeLogger.error('Error updating permissions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update permissions'
      });
    }
  }
);

/**
 * @route GET /api/seller/security/permissions/:walletAddress
 * @desc Get seller permissions
 * @access Protected
 */
router.get('/permissions/:walletAddress',
  rateLimitingMiddleware({ maxRequests: 100, windowMs: 300000 }), // 100 requests per 5 minutes
  sellerSecurityMiddleware.validateSellerAccess(['permissions']),
  async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      // In a real implementation, this would query permissions from the database
      res.json({
        success: true,
        data: {
          walletAddress,
          role: req.sellerSecurity?.role || 'viewer',
          permissions: req.sellerSecurity?.permissions || [],
          assignedBy: walletAddress, // Self-assigned for owner
          assignedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      safeLogger.error('Error getting permissions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get permissions'
      });
    }
  }
);

/**
 * @route POST /api/seller/security/alert/:walletAddress
 * @desc Create security alert
 * @access Protected - System/Admin only
 */
router.post('/alert/:walletAddress', csrfProtection, 
  rateLimitingMiddleware({ maxRequests: 20, windowMs: 300000 }), // 20 requests per 5 minutes
  sellerSecurityMiddleware.validateSellerAccess(['security']),
  sellerSecurityMiddleware.auditSellerOperation('security_alert', 'security', 'alert'),
  async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const { alertType, severity, message, metadata } = req.body;

      if (!alertType || !severity || !message) {
        return validationErrorResponse(res, 'Alert type, severity, and message are required');
      }

      // In a real implementation, this would create a security alert
      res.json({
        success: true,
        message: 'Security alert created successfully',
        data: {
          alertId: `alert_${Date.now()}`,
          walletAddress,
          alertType,
          severity,
          message,
          metadata: metadata || {},
          createdAt: new Date().toISOString()
        }
      });
    } catch (error) {
      safeLogger.error('Error creating security alert:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create security alert'
      });
    }
  }
);

export default router;