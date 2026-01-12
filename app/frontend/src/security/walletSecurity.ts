/**
 * Wallet Security with Secure Session Management
 * Comprehensive wallet security for the enhanced social dashboard
 */

import { ethers } from 'ethers';
import { SecureString, clearObject } from './SecureString';

export interface WalletSecurityConfig {
  sessionTimeout: number; // milliseconds
  maxInactivity: number; // milliseconds
  requireReauth: boolean;
  enableBiometric: boolean;
  encryptStorage: boolean;
  allowedNetworks: number[];
  maxTransactionValue: bigint;
  requireConfirmation: boolean;
}

export interface SecureSession {
  id: string;
  walletAddress: string;
  networkId: number;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  permissions: WalletPermission[];
  metadata: SessionMetadata;
}

export interface WalletPermission {
  type: 'read' | 'sign' | 'send' | 'approve';
  scope: string;
  expiresAt?: Date;
  used: number;
  maxUses?: number;
}

export interface SessionMetadata {
  userAgent: string;
  ipAddress?: string;
  deviceFingerprint: string;
  location?: string;
  riskScore: number;
}

export interface WalletSecurityResult {
  success: boolean;
  session?: SecureSession;
  errors: string[];
  warnings: string[];
  requiresAction?: 'reauth' | 'network_switch' | 'permission_grant';
}

export interface SecurityEvent {
  type: 'login' | 'logout' | 'transaction' | 'permission_change' | 'suspicious_activity';
  timestamp: Date;
  walletAddress: string;
  details: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class WalletSecurity {
  private static readonly DEFAULT_CONFIG: WalletSecurityConfig = {
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    maxInactivity: 30 * 60 * 1000, // 30 minutes
    requireReauth: true,
    enableBiometric: false,
    encryptStorage: true,
    allowedNetworks: [1, 5, 137, 80001], // Mainnet, Goerli, Polygon, Mumbai
    maxTransactionValue: BigInt(ethers.parseEther('10').toString()),
    requireConfirmation: true
  };

  private static sessions = new Map<string, SecureSession>();
  private static securityEvents: SecurityEvent[] = [];
  private static encryptionKey: CryptoKey | null = null;

  /**
   * Initialize wallet security system
   */
  static async initialize(config: Partial<WalletSecurityConfig> = {}): Promise<void> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    // Initialize encryption key if needed
    if (finalConfig.encryptStorage) {
      await this.initializeEncryption();
    }

    // Set up session cleanup
    this.startSessionCleanup();

    // Set up security monitoring
    this.startSecurityMonitoring();
  }

  /**
   * Create secure wallet session
   */
  static async createSession(
    walletAddress: string,
    networkId: number,
    provider: ethers.Provider,
    config: Partial<WalletSecurityConfig> = {}
  ): Promise<WalletSecurityResult> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate wallet address
      const addressValidation = this.validateWalletAddress(walletAddress);
      if (!addressValidation.valid) {
        errors.push(...addressValidation.errors);
        return { success: false, errors, warnings };
      }

      // Validate network
      const networkValidation = this.validateNetwork(networkId, finalConfig);
      if (!networkValidation.valid) {
        errors.push(...networkValidation.errors);
        warnings.push(...networkValidation.warnings);

        if (networkValidation.requiresSwitch) {
          return {
            success: false,
            errors,
            warnings,
            requiresAction: 'network_switch'
          };
        }
      }

      // Check for existing session
      const existingSession = this.findExistingSession(walletAddress, networkId);
      if (existingSession && this.isSessionValid(existingSession)) {
        // Update activity
        existingSession.lastActivity = new Date();
        await this.saveSession(existingSession);

        return {
          success: true,
          session: existingSession,
          errors,
          warnings
        };
      }

      // Create device fingerprint
      const deviceFingerprint = await this.generateDeviceFingerprint();

      // Calculate risk score
      const riskScore = await this.calculateRiskScore(walletAddress, deviceFingerprint);

      // Create new session
      const session: SecureSession = {
        id: this.generateSessionId(),
        walletAddress,
        networkId,
        createdAt: new Date(),
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + finalConfig.sessionTimeout),
        permissions: this.getDefaultPermissions(),
        metadata: {
          userAgent: navigator.userAgent,
          deviceFingerprint,
          riskScore
        }
      };

      // Save session
      await this.saveSession(session);

      // Log security event
      this.logSecurityEvent({
        type: 'login',
        timestamp: new Date(),
        walletAddress,
        details: { networkId, riskScore },
        riskLevel: riskScore > 0.7 ? 'high' : riskScore > 0.4 ? 'medium' : 'low'
      });

      return {
        success: true,
        session,
        errors,
        warnings
      };

    } catch (error) {
      errors.push(`Session creation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: false, errors, warnings };
    }
  }

  /**
   * Validate wallet session
   */
  static async validateSession(sessionId: string): Promise<WalletSecurityResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        errors.push('Session not found');
        return { success: false, errors, warnings, requiresAction: 'reauth' };
      }

      // Check if session is expired
      if (!this.isSessionValid(session)) {
        errors.push('Session expired');
        await this.destroySession(sessionId);
        return { success: false, errors, warnings, requiresAction: 'reauth' };
      }

      // Check inactivity
      const inactivityTime = Date.now() - session.lastActivity.getTime();
      if (inactivityTime > this.DEFAULT_CONFIG.maxInactivity) {
        warnings.push('Session inactive for extended period');
        return { success: false, errors, warnings, requiresAction: 'reauth' };
      }

      // Update activity
      session.lastActivity = new Date();
      await this.saveSession(session);

      return {
        success: true,
        session,
        errors,
        warnings
      };

    } catch (error) {
      errors.push(`Session validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: false, errors, warnings };
    }
  }

  /**
   * Request wallet permission
   */
  static async requestPermission(
    sessionId: string,
    permission: Omit<WalletPermission, 'used'>
  ): Promise<WalletSecurityResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const sessionResult = await this.validateSession(sessionId);
      if (!sessionResult.success || !sessionResult.session) {
        return sessionResult;
      }

      const session = sessionResult.session;

      // Check if permission already exists
      const existingPermission = session.permissions.find(p =>
        p.type === permission.type && p.scope === permission.scope
      );

      if (existingPermission) {
        // Update existing permission
        if (permission.expiresAt) {
          existingPermission.expiresAt = permission.expiresAt;
        }
        if (permission.maxUses) {
          existingPermission.maxUses = permission.maxUses;
        }
      } else {
        // Add new permission
        session.permissions.push({
          ...permission,
          used: 0
        });
      }

      await this.saveSession(session);

      // Log permission change
      this.logSecurityEvent({
        type: 'permission_change',
        timestamp: new Date(),
        walletAddress: session.walletAddress,
        details: { permission },
        riskLevel: 'low'
      });

      return {
        success: true,
        session,
        errors,
        warnings
      };

    } catch (error) {
      errors.push(`Permission request error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: false, errors, warnings };
    }
  }

  /**
   * Check if user has permission
   */
  static async hasPermission(
    sessionId: string,
    permissionType: WalletPermission['type'],
    scope: string
  ): Promise<boolean> {
    try {
      const sessionResult = await this.validateSession(sessionId);
      if (!sessionResult.success || !sessionResult.session) {
        return false;
      }

      const session = sessionResult.session;
      const permission = session.permissions.find(p =>
        p.type === permissionType && p.scope === scope
      );

      if (!permission) return false;

      // Check if permission is expired
      if (permission.expiresAt && permission.expiresAt < new Date()) {
        return false;
      }

      // Check if permission is exhausted
      if (permission.maxUses && permission.used >= permission.maxUses) {
        return false;
      }

      return true;

    } catch {
      return false;
    }
  }

  /**
   * Use permission (increment usage counter)
   */
  static async usePermission(
    sessionId: string,
    permissionType: WalletPermission['type'],
    scope: string
  ): Promise<boolean> {
    try {
      const sessionResult = await this.validateSession(sessionId);
      if (!sessionResult.success || !sessionResult.session) {
        return false;
      }

      const session = sessionResult.session;
      const permission = session.permissions.find(p =>
        p.type === permissionType && p.scope === scope
      );

      if (!permission) return false;

      permission.used++;
      await this.saveSession(session);

      return true;

    } catch {
      return false;
    }
  }

  /**
   * Destroy wallet session
   */
  static async destroySession(sessionId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (session) {
        // Log logout event
        this.logSecurityEvent({
          type: 'logout',
          timestamp: new Date(),
          walletAddress: session.walletAddress,
          details: { sessionId },
          riskLevel: 'low'
        });

        // Clear sensitive data from memory
        clearObject(session);
      }

      // Remove from memory
      this.sessions.delete(sessionId);

      // Remove from storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`wallet_session_${sessionId}`);
      }

    } catch (error) {
      console.error('Error destroying session:', error);
    }
  }

  /**
   * Get security events for wallet
   */
  static getSecurityEvents(walletAddress: string, limit = 50): SecurityEvent[] {
    return this.securityEvents
      .filter(event => event.walletAddress.toLowerCase() === walletAddress.toLowerCase())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Private helper methods
   */
  private static validateWalletAddress(address: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    try {
      ethers.getAddress(address);
      return { valid: true, errors };
    } catch {
      errors.push('Invalid wallet address format');
      return { valid: false, errors };
    }
  }

  private static validateNetwork(
    networkId: number,
    config: WalletSecurityConfig
  ): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    requiresSwitch: boolean;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.allowedNetworks.includes(networkId)) {
      errors.push(`Network ${networkId} is not allowed`);
      return {
        valid: false,
        errors,
        warnings,
        requiresSwitch: true
      };
    }

    return {
      valid: true,
      errors,
      warnings,
      requiresSwitch: false
    };
  }

  private static findExistingSession(
    walletAddress: string,
    networkId: number
  ): SecureSession | null {
    for (const session of this.sessions.values()) {
      if (session.walletAddress.toLowerCase() === walletAddress.toLowerCase() &&
        session.networkId === networkId) {
        return session;
      }
    }
    return null;
  }

  private static isSessionValid(session: SecureSession): boolean {
    return session.expiresAt > new Date();
  }

  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private static async generateDeviceFingerprint(): Promise<string> {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset().toString(),
      navigator.hardwareConcurrency?.toString() || 'unknown'
    ];

    const fingerprint = components.join('|');

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(fingerprint);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return btoa(fingerprint).replace(/[^a-zA-Z0-9]/g, '');
    }
  }

  private static async calculateRiskScore(
    walletAddress: string,
    deviceFingerprint: string
  ): Promise<number> {
    let riskScore = 0;

    // Check for new device
    const knownDevices = this.getKnownDevices(walletAddress);
    if (!knownDevices.includes(deviceFingerprint)) {
      riskScore += 0.3;
    }

    // Check recent suspicious activity
    const recentEvents = this.getSecurityEvents(walletAddress, 10);
    const suspiciousEvents = recentEvents.filter(e => e.riskLevel === 'high' || e.riskLevel === 'critical');
    riskScore += suspiciousEvents.length * 0.2;

    // Check time-based patterns
    const now = new Date();
    const hour = now.getHours();
    if (hour < 6 || hour > 22) {
      riskScore += 0.1; // Unusual hours
    }

    return Math.min(riskScore, 1);
  }

  private static getDefaultPermissions(): WalletPermission[] {
    return [
      {
        type: 'read',
        scope: 'balance',
        used: 0
      },
      {
        type: 'read',
        scope: 'transactions',
        used: 0
      }
    ];
  }

  private static async saveSession(session: SecureSession): Promise<void> {
    // Save to memory
    this.sessions.set(session.id, session);

    // Save to encrypted storage if available
    if (typeof window !== 'undefined' && this.DEFAULT_CONFIG.encryptStorage) {
      try {
        const encrypted = await this.encryptData(JSON.stringify(session));
        localStorage.setItem(`wallet_session_${session.id}`, encrypted);
      } catch (error) {
        console.error('Error saving encrypted session:', error);
        // Fallback to unencrypted storage
        localStorage.setItem(`wallet_session_${session.id}`, JSON.stringify(session));
      }
    }
  }

  private static async getSession(sessionId: string): Promise<SecureSession | null> {
    // Check memory first
    const memorySession = this.sessions.get(sessionId);
    if (memorySession) {
      return memorySession;
    }

    // Check storage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`wallet_session_${sessionId}`);
        if (stored) {
          let sessionData: string;

          if (this.DEFAULT_CONFIG.encryptStorage) {
            sessionData = await this.decryptData(stored);
          } else {
            sessionData = stored;
          }

          const session = JSON.parse(sessionData) as SecureSession;

          // Convert date strings back to Date objects
          session.createdAt = new Date(session.createdAt);
          session.lastActivity = new Date(session.lastActivity);
          session.expiresAt = new Date(session.expiresAt);

          // Save to memory
          this.sessions.set(sessionId, session);

          return session;
        }
      } catch (error) {
        console.error('Error loading session:', error);
      }
    }

    return null;
  }

  private static logSecurityEvent(event: SecurityEvent): void {
    this.securityEvents.push(event);

    // Keep only last 1000 events
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }

    // Log to console for debugging
    console.log('Security Event:', event);
  }

  private static getKnownDevices(walletAddress: string): string[] {
    // This would typically be stored in a database
    // For now, return empty array
    return [];
  }

  private static async initializeEncryption(): Promise<void> {
    try {
      this.encryptionKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
    }
  }

  private static async encryptData(data: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption not initialized');
    }

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      dataBuffer
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  private static async decryptData(encryptedData: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption not initialized');
    }

    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );

    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  private static startSessionCleanup(): void {
    setInterval(() => {
      const now = new Date();
      const expiredSessions: string[] = [];

      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.expiresAt < now) {
          expiredSessions.push(sessionId);
        }
      }

      expiredSessions.forEach(sessionId => {
        this.destroySession(sessionId);
      });
    }, 60000); // Check every minute
  }

  private static startSecurityMonitoring(): void {
    // Monitor for suspicious patterns
    setInterval(() => {
      // This would implement more sophisticated monitoring
      // For now, just clean up old events
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
      this.securityEvents = this.securityEvents.filter(event => event.timestamp > cutoff);
    }, 60 * 60 * 1000); // Check every hour
  }

  /**
   * Rotate session ID to prevent session fixation attacks
   */
  private static async rotateSession(oldSession: SecureSession): Promise<SecureSession> {
    // Create new session with new ID but same data
    const newSession: SecureSession = {
      ...oldSession,
      id: this.generateSessionId(),
      lastActivity: new Date(),
    };

    // Save new session
    await this.saveSession(newSession);

    // Destroy old session
    await this.destroySession(oldSession.id);

    // Log session rotation
    this.logSecurityEvent({
      type: 'permission_change',
      timestamp: new Date(),
      walletAddress: oldSession.walletAddress,
      details: { action: 'session_rotation', oldSessionId: oldSession.id, newSessionId: newSession.id },
      riskLevel: 'low'
    });

    return newSession;
  }

  /**
   * Set secure cookie for session (if in browser environment)
   */
  static setSecureCookie(sessionId: string, maxAge: number): void {
    if (typeof document === 'undefined') return;

    const cookieOptions = [
      `session_id=${sessionId}`,
      `Max-Age=${maxAge}`,
      'Path=/',
      'SameSite=Strict',
      'Secure', // HTTPS only
      'HttpOnly', // Not accessible via JavaScript (note: this won't work client-side)
    ];

    document.cookie = cookieOptions.join('; ');
  }

  /**
   * Clear session cookie
   */
  static clearSecureCookie(): void {
    if (typeof document === 'undefined') return;
    document.cookie = 'session_id=; Max-Age=0; Path=/; SameSite=Strict; Secure';
  }
}

export default WalletSecurity;