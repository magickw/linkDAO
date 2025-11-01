/**
 * Seller Security Service
 * 
 * Comprehensive security service for seller data protection, wallet ownership verification,
 * role-based access control, data sanitization, and audit logging for seller operations.
 */

import crypto from 'crypto';
import { safeLogger } from '../utils/safeLogger';
import { EventEmitter } from 'events';
import { securityConfig } from '../config/securityConfig';
import securityMonitoringService, { SecurityEventType, SecuritySeverity } from './securityMonitoringService';
import AuditLoggingService from './auditLoggingService';
import { EncryptionService } from './encryptionService';

export interface SellerAccessRequest {
  walletAddress: string;
  requestedData: string[];
  requestorAddress?: string;
  requestorRole?: SellerRole;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface WalletOwnershipVerification {
  walletAddress: string;
  signature: string;
  message: string;
  timestamp: number;
  nonce: string;
}

export enum SellerRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  VIEWER = 'viewer',
  SYSTEM = 'system'
}

export interface SellerPermission {
  resource: string;
  actions: string[];
  conditions?: Record<string, any>;
}

export interface SellerSecurityContext {
  walletAddress: string;
  role: SellerRole;
  permissions: SellerPermission[];
  sessionId: string;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface DataSanitizationRule {
  field: string;
  type: 'remove' | 'mask' | 'encrypt' | 'hash';
  pattern?: RegExp;
  replacement?: string;
}

export interface SellerAuditEvent {
  eventType: string;
  walletAddress: string;
  actorAddress?: string;
  resource: string;
  action: string;
  oldState?: any;
  newState?: any;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

class SellerSecurityService extends EventEmitter {
  private securityMonitoring: typeof securityMonitoringService;
  private auditLogging: AuditLoggingService;
  private encryptionService: EncryptionService;
  private activeSessions: Map<string, SellerSecurityContext> = new Map();
  private verificationNonces: Map<string, { nonce: string; timestamp: number }> = new Map();
  private rolePermissions: Map<SellerRole, SellerPermission[]> = new Map();

  constructor() {
    super();
    this.securityMonitoring = securityMonitoringService;
    this.auditLogging = new AuditLoggingService();
    this.encryptionService = new EncryptionService();
    this.initializeRolePermissions();
    this.startSessionCleanup();
  }

  /**
   * Initialize role-based permissions
   */
  private initializeRolePermissions(): void {
    // Owner permissions - full access
    this.rolePermissions.set(SellerRole.OWNER, [
      { resource: 'profile', actions: ['read', 'write', 'delete'] },
      { resource: 'listings', actions: ['read', 'write', 'delete'] },
      { resource: 'orders', actions: ['read', 'write', 'update'] },
      { resource: 'analytics', actions: ['read'] },
      { resource: 'settings', actions: ['read', 'write'] },
      { resource: 'permissions', actions: ['read', 'write'] },
      { resource: 'audit', actions: ['read'] }
    ]);

    // Admin permissions - management access
    this.rolePermissions.set(SellerRole.ADMIN, [
      { resource: 'profile', actions: ['read', 'write'] },
      { resource: 'listings', actions: ['read', 'write', 'delete'] },
      { resource: 'orders', actions: ['read', 'write', 'update'] },
      { resource: 'analytics', actions: ['read'] },
      { resource: 'settings', actions: ['read'] }
    ]);

    // Moderator permissions - content management
    this.rolePermissions.set(SellerRole.MODERATOR, [
      { resource: 'profile', actions: ['read'] },
      { resource: 'listings', actions: ['read', 'write'] },
      { resource: 'orders', actions: ['read', 'update'] },
      { resource: 'analytics', actions: ['read'] }
    ]);

    // Viewer permissions - read-only
    this.rolePermissions.set(SellerRole.VIEWER, [
      { resource: 'profile', actions: ['read'] },
      { resource: 'listings', actions: ['read'] },
      { resource: 'orders', actions: ['read'] },
      { resource: 'analytics', actions: ['read'] }
    ]);

    // System permissions - automated operations
    this.rolePermissions.set(SellerRole.SYSTEM, [
      { resource: 'profile', actions: ['read', 'write'] },
      { resource: 'listings', actions: ['read', 'write'] },
      { resource: 'orders', actions: ['read', 'write', 'update'] },
      { resource: 'analytics', actions: ['read', 'write'] },
      { resource: 'audit', actions: ['write'] }
    ]);
  }

  /**
   * Validate seller access request
   */
  async validateSellerAccess(request: SellerAccessRequest): Promise<boolean> {
    try {
      // Log access attempt
      await this.logSellerAuditEvent({
        eventType: 'access_attempt',
        walletAddress: request.walletAddress,
        actorAddress: request.requestorAddress,
        resource: 'seller_data',
        action: 'access_validation',
        metadata: { requestedData: request.requestedData },
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        timestamp: new Date()
      });

      // Verify wallet ownership if required
      if (request.requestorAddress && request.requestorAddress !== request.walletAddress) {
        const hasPermission = await this.checkRoleBasedAccess(
          request.requestorAddress,
          request.requestedData,
          request.walletAddress
        );
        
        if (!hasPermission) {
          await this.securityMonitoring.recordSecurityEvent({
            type: SecurityEventType.AUTHORIZATION_VIOLATION,
            severity: SecuritySeverity.MEDIUM,
            source: 'seller_security_service',
            userId: request.requestorAddress,
            ipAddress: request.ipAddress,
            userAgent: request.userAgent,
            details: {
              targetWallet: request.walletAddress,
              requestedData: request.requestedData,
              reason: 'insufficient_permissions'
            }
          });
          return false;
        }
      }

      // Check for suspicious patterns
      await this.detectSuspiciousAccess(request);

      return true;
    } catch (error) {
      safeLogger.error('Error validating seller access:', error);
      
      await this.securityMonitoring.recordSecurityEvent({
        type: SecurityEventType.SYSTEM_COMPROMISE,
        severity: SecuritySeverity.HIGH,
        source: 'seller_security_service',
        userId: request.requestorAddress,
        ipAddress: request.ipAddress,
        details: { error: error.message, request }
      });

      return false;
    }
  }

  /**
   * Verify wallet ownership through signature verification
   */
  async verifyWalletOwnership(verification: WalletOwnershipVerification): Promise<boolean> {
    try {
      // Check nonce validity
      const storedNonce = this.verificationNonces.get(verification.walletAddress);
      if (!storedNonce || storedNonce.nonce !== verification.nonce) {
        await this.securityMonitoring.recordSecurityEvent({
          type: SecurityEventType.AUTHENTICATION_FAILURE,
          severity: SecuritySeverity.MEDIUM,
          source: 'seller_security_service',
          userId: verification.walletAddress,
          details: { reason: 'invalid_nonce' }
        });
        return false;
      }

      // Check timestamp validity (5 minutes window)
      const now = Date.now();
      if (now - verification.timestamp > 300000) {
        await this.securityMonitoring.recordSecurityEvent({
          type: SecurityEventType.AUTHENTICATION_FAILURE,
          severity: SecuritySeverity.LOW,
          source: 'seller_security_service',
          userId: verification.walletAddress,
          details: { reason: 'expired_timestamp' }
        });
        return false;
      }

      // Verify signature (simplified - in production use proper crypto library)
      const messageHash = crypto
        .createHash('sha256')
        .update(verification.message + verification.nonce + verification.timestamp)
        .digest('hex');

      // In a real implementation, you would verify the signature against the wallet address
      // This is a simplified version for demonstration
      const isValidSignature = this.verifyEthereumSignature(
        messageHash,
        verification.signature,
        verification.walletAddress
      );

      if (!isValidSignature) {
        await this.securityMonitoring.recordSecurityEvent({
          type: SecurityEventType.AUTHENTICATION_FAILURE,
          severity: SecuritySeverity.HIGH,
          source: 'seller_security_service',
          userId: verification.walletAddress,
          details: { reason: 'invalid_signature' }
        });
        return false;
      }

      // Clean up used nonce
      this.verificationNonces.delete(verification.walletAddress);

      // Log successful verification
      await this.logSellerAuditEvent({
        eventType: 'wallet_verification',
        walletAddress: verification.walletAddress,
        resource: 'wallet_ownership',
        action: 'verify',
        metadata: { success: true },
        timestamp: new Date()
      });

      return true;
    } catch (error) {
      safeLogger.error('Error verifying wallet ownership:', error);
      
      await this.securityMonitoring.recordSecurityEvent({
        type: SecurityEventType.SYSTEM_COMPROMISE,
        severity: SecuritySeverity.HIGH,
        source: 'seller_security_service',
        userId: verification.walletAddress,
        details: { error: error.message, verification }
      });

      return false;
    }
  }

  /**
   * Generate verification nonce for wallet ownership
   */
  generateVerificationNonce(walletAddress: string): string {
    const nonce = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now();
    
    this.verificationNonces.set(walletAddress, { nonce, timestamp });
    
    // Clean up old nonces after 10 minutes
    setTimeout(() => {
      this.verificationNonces.delete(walletAddress);
    }, 600000);

    return nonce;
  }

  /**
   * Check role-based access control
   */
  async checkRoleBasedAccess(
    requestorAddress: string,
    requestedData: string[],
    targetWalletAddress: string
  ): Promise<boolean> {
    try {
      // Get requestor's role for the target seller
      const role = await this.getSellerRole(requestorAddress, targetWalletAddress);
      if (!role) return false;

      // Get permissions for the role
      const permissions = this.rolePermissions.get(role) || [];

      // Check if requested data access is allowed
      for (const dataType of requestedData) {
        const hasPermission = permissions.some(permission => 
          permission.resource === dataType && 
          permission.actions.includes('read')
        );

        if (!hasPermission) {
          await this.logSellerAuditEvent({
            eventType: 'access_denied',
            walletAddress: targetWalletAddress,
            actorAddress: requestorAddress,
            resource: dataType,
            action: 'read',
            metadata: { role, reason: 'insufficient_permissions' },
            timestamp: new Date()
          });
          return false;
        }
      }

      return true;
    } catch (error) {
      safeLogger.error('Error checking role-based access:', error);
      return false;
    }
  }

  /**
   * Sanitize seller data for safe transmission/storage
   */
  async sanitizeSellerData(data: any, context: 'storage' | 'transmission' | 'logging'): Promise<any> {
    try {
      // Handle circular references by using a custom deep clone
      const sanitized = this.deepCloneWithoutCircular(data);

      // Define sanitization rules based on context
      const rules: DataSanitizationRule[] = this.getSanitizationRules(context);

      // Apply sanitization rules
      for (const rule of rules) {
        await this.applySanitizationRule(sanitized, rule);
      }

      // Log sanitization event
      await this.logSellerAuditEvent({
        eventType: 'data_sanitization',
        walletAddress: data.walletAddress || 'unknown',
        resource: 'seller_data',
        action: 'sanitize',
        metadata: { context, rulesApplied: rules.length },
        timestamp: new Date()
      });

      return sanitized;
    } catch (error) {
      safeLogger.error('Error sanitizing seller data:', error);
      throw new Error('Data sanitization failed');
    }
  }

  /**
   * Deep clone object while handling circular references
   */
  private deepCloneWithoutCircular(obj: any, seen = new WeakSet()): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (seen.has(obj)) {
      return '[Circular Reference]';
    }

    seen.add(obj);

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepCloneWithoutCircular(item, seen));
    }

    const cloned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepCloneWithoutCircular(obj[key], seen);
      }
    }

    seen.delete(obj);
    return cloned;
  }

  /**
   * Log seller audit events
   */
  async logSellerAuditEvent(event: SellerAuditEvent): Promise<void> {
    try {
      await this.auditLogging.createAuditLog({
        actionType: event.eventType,
        actorId: event.actorAddress || event.walletAddress,
        actorType: 'user',
        oldState: event.oldState,
        newState: event.newState,
        reasoning: `Seller security event: ${event.action} on ${event.resource}`,
        metadata: {
          ...event.metadata,
          resource: event.resource,
          action: event.action,
          walletAddress: event.walletAddress,
          sellerSecurityEvent: true
        },
        ipAddress: event.ipAddress,
        userAgent: event.userAgent
      });

      // Emit event for real-time processing
      this.emit('sellerAuditEvent', event);
    } catch (error) {
      safeLogger.error('Error logging seller audit event:', error);
    }
  }

  /**
   * Create seller security session
   */
  async createSecuritySession(
    walletAddress: string,
    role: SellerRole,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    const sessionId = crypto.randomUUID();
    const permissions = this.rolePermissions.get(role) || [];

    const context: SellerSecurityContext = {
      walletAddress,
      role,
      permissions,
      sessionId,
      lastActivity: new Date(),
      ipAddress,
      userAgent
    };

    this.activeSessions.set(sessionId, context);

    await this.logSellerAuditEvent({
      eventType: 'session_created',
      walletAddress,
      resource: 'security_session',
      action: 'create',
      metadata: { sessionId, role },
      ipAddress,
      userAgent,
      timestamp: new Date()
    });

    return sessionId;
  }

  /**
   * Validate security session
   */
  async validateSecuritySession(sessionId: string): Promise<SellerSecurityContext | null> {
    const context = this.activeSessions.get(sessionId);
    if (!context) return null;

    // Check session timeout
    const now = new Date();
    const sessionAge = now.getTime() - context.lastActivity.getTime();
    
    if (sessionAge > securityConfig.authentication.sessionTimeout) {
      this.activeSessions.delete(sessionId);
      
      await this.logSellerAuditEvent({
        eventType: 'session_expired',
        walletAddress: context.walletAddress,
        resource: 'security_session',
        action: 'expire',
        metadata: { sessionId, sessionAge },
        timestamp: new Date()
      });

      return null;
    }

    // Update last activity
    context.lastActivity = now;
    this.activeSessions.set(sessionId, context);

    return context;
  }

  /**
   * Revoke security session
   */
  async revokeSecuritySession(sessionId: string): Promise<boolean> {
    const context = this.activeSessions.get(sessionId);
    if (!context) return false;

    this.activeSessions.delete(sessionId);

    await this.logSellerAuditEvent({
      eventType: 'session_revoked',
      walletAddress: context.walletAddress,
      resource: 'security_session',
      action: 'revoke',
      metadata: { sessionId },
      timestamp: new Date()
    });

    return true;
  }

  /**
   * Private helper methods
   */
  private async getSellerRole(requestorAddress: string, targetWalletAddress: string): Promise<SellerRole | null> {
    // In a real implementation, this would query the database for role assignments
    // For now, return owner if addresses match, otherwise null
    if (requestorAddress === targetWalletAddress) {
      return SellerRole.OWNER;
    }
    
    // Check if requestor has any assigned role for this seller
    // This would typically involve database queries
    return null;
  }

  private verifyEthereumSignature(messageHash: string, signature: string, walletAddress: string): boolean {
    // Simplified signature verification
    // In production, use proper Ethereum signature verification libraries
    return signature.length === 132 && walletAddress.length === 42;
  }

  private async detectSuspiciousAccess(request: SellerAccessRequest): Promise<void> {
    // Check for unusual access patterns
    const key = `access_${request.walletAddress}_${request.ipAddress}`;
    // Implementation would track access patterns and detect anomalies
  }

  private getSanitizationRules(context: string): DataSanitizationRule[] {
    const baseRules: DataSanitizationRule[] = [
      { field: 'privateKey', type: 'remove' },
      { field: 'internalNotes', type: 'remove' },
      { field: 'adminFlags', type: 'remove' },
      { field: 'email', type: 'mask', pattern: /(.{2}).*(@.*)/, replacement: '$1***$2' },
      { field: 'phone', type: 'mask', pattern: /(\d{3}).*(\d{4})/, replacement: '$1***$2' }
    ];

    if (context === 'logging') {
      baseRules.push(
        { field: 'walletAddress', type: 'mask', pattern: /(0x.{4}).*(.{4})/, replacement: '$1...$2' },
        { field: 'signature', type: 'hash' }
      );
    }

    return baseRules;
  }

  private async applySanitizationRule(data: any, rule: DataSanitizationRule): Promise<void> {
    const applyToObject = async (obj: any, path: string[] = []): Promise<void> => {
      if (typeof obj !== 'object' || obj === null) return;

      for (const [key, value] of Object.entries(obj)) {
        const currentPath = [...path, key];
        
        if (key === rule.field) {
          switch (rule.type) {
            case 'remove':
              delete obj[key];
              break;
            case 'mask':
              if (typeof value === 'string' && rule.pattern && rule.replacement) {
                obj[key] = value.replace(rule.pattern, rule.replacement);
              }
              break;
            case 'hash':
              if (typeof value === 'string') {
                obj[key] = crypto.createHash('sha256').update(value).digest('hex').substring(0, 16);
              }
              break;
            case 'encrypt':
              if (typeof value === 'string') {
                // Simple encryption for demonstration - in production use proper encryption
                obj[key] = crypto.createHash('sha256').update(value + 'salt').digest('hex');
              }
              break;
          }
        } else if (typeof value === 'object') {
          await applyToObject(value, currentPath);
        }
      }
    };

    await applyToObject(data);
  }

  private startSessionCleanup(): void {
    // Clean up expired sessions every 5 minutes
    setInterval(() => {
      const now = new Date();
      const expiredSessions: string[] = [];

      for (const [sessionId, context] of this.activeSessions.entries()) {
        const sessionAge = now.getTime() - context.lastActivity.getTime();
        if (sessionAge > securityConfig.authentication.sessionTimeout) {
          expiredSessions.push(sessionId);
        }
      }

      expiredSessions.forEach(sessionId => {
        this.activeSessions.delete(sessionId);
      });

      if (expiredSessions.length > 0) {
        safeLogger.info(`Cleaned up ${expiredSessions.length} expired seller security sessions`);
      }
    }, 300000); // 5 minutes
  }
}

export default SellerSecurityService;
