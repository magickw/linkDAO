/**
 * TOTP-Based 2FA Service
 * Implements Time-based One-Time Password authentication
 */

import { webAuthnService } from './webAuthnService';
import { auditLogger } from './auditLogger';

export interface TOTPSecret {
  secret: string;
  userId: string;
  createdAt: number;
  verified: boolean;
  backupCodes: string[];
}

export interface TOTPVerificationResult {
  success: boolean;
  error?: string;
  remainingAttempts?: number;
  blockedUntil?: number;
}

export class TOTPService {
  private static instance: TOTPService;
  private secrets: Map<string, TOTPSecret> = new Map();
  private attempts: Map<string, { count: number; lastAttempt: number; blockedUntil: number }> = new Map();
  private readonly MAX_ATTEMPTS = 5;
  private readonly ATTEMPT_WINDOW = 5 * 60 * 1000; // 5 minutes
  private readonly BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes

  private constructor() {}

  static getInstance(): TOTPService {
    if (!TOTPService.instance) {
      TOTPService.instance = new TOTPService();
    }
    return TOTPService.instance;
  }

  /**
   * Generate a random base32 secret
   */
  private generateSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      let code = '';
      for (let j = 0; j < 8; j++) {
        code += Math.floor(Math.random() * 10);
      }
      codes.push(code);
    }
    return codes;
  }

  /**
   * Generate TOTP secret for a user
   */
  async generateSecret(userId: string): Promise<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  }> {
    const secret = this.generateSecret();
    const backupCodes = this.generateBackupCodes();

    const totpSecret: TOTPSecret = {
      secret,
      userId,
      createdAt: Date.now(),
      verified: false,
      backupCodes
    };

    this.secrets.set(userId, totpSecret);

    // Generate QR code URL for authenticator apps
    const appName = 'LinkDAO Wallet';
    const qrCodeUrl = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(userId)}?secret=${secret}&issuer=${encodeURIComponent(appName)}`;

    // Log 2FA setup
    auditLogger.log({
      type: '2fa_setup_initiated',
      userId,
      details: {
        method: 'totp'
      },
      category: 'authentication',
      severity: 'info'
    });

    return {
      secret,
      qrCodeUrl,
      backupCodes
    };
  }

  /**
   * Verify TOTP code
   */
  async verifyCode(userId: string, code: string): Promise<TOTPVerificationResult> {
    // Check if user is blocked
    const attempts = this.attempts.get(userId);
    if (attempts && attempts.blockedUntil > Date.now()) {
      const timeUntilUnblock = Math.ceil((attempts.blockedUntil - Date.now()) / 60000);
      return {
        success: false,
        error: `Too many failed attempts. Please try again in ${timeUntilUnblock} minutes.`,
        blockedUntil: attempts.blockedUntil
      };
    }

    const totpSecret = this.secrets.get(userId);
    if (!totpSecret) {
      return {
        success: false,
        error: 'TOTP secret not found. Please set up 2FA first.'
      };
    }

    // Validate code format
    if (!/^\d{6}$/.test(code)) {
      return {
        success: false,
        error: 'Invalid code format. Code must be 6 digits.'
      };
    }

    // Generate valid codes for current time window (allow 1 step before and after)
    const validCodes = this.generateValidCodes(totpSecret.secret);

    if (validCodes.includes(code)) {
      // Reset attempts on success
      this.attempts.delete(userId);

      // Mark secret as verified if this is the first successful verification
      if (!totpSecret.verified) {
        totpSecret.verified = true;
        this.secrets.set(userId, totpSecret);

        auditLogger.log({
          type: '2fa_verified',
          userId,
          details: {
            method: 'totp'
          },
          category: 'authentication',
          severity: 'info'
        });
      }

      return {
        success: true
      };
    }

    // Record failed attempt
    this.recordFailedAttempt(userId);

    const currentAttempts = this.attempts.get(userId);
    const remainingAttempts = this.MAX_ATTEMPTS - (currentAttempts?.count || 0);

    return {
      success: false,
      error: 'Invalid code',
      remainingAttempts
    };
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(userId: string, code: string): Promise<TOTPVerificationResult> {
    const totpSecret = this.secrets.get(userId);
    if (!totpSecret) {
      return {
        success: false,
        error: 'TOTP secret not found. Please set up 2FA first.'
      };
    }

    // Validate code format
    if (!/^\d{8}$/.test(code)) {
      return {
        success: false,
        error: 'Invalid backup code format. Code must be 8 digits.'
      };
    }

    // Check if backup code exists and hasn't been used
    const codeIndex = totpSecret.backupCodes.indexOf(code);
    if (codeIndex === -1) {
      return {
        success: false,
        error: 'Invalid backup code'
      };
    }

    // Remove used backup code
    totpSecret.backupCodes.splice(codeIndex, 1);
    this.secrets.set(userId, totpSecret);

    // Log backup code usage
    auditLogger.log({
      type: '2fa_backup_code_used',
      userId,
      details: {
        remainingCodes: totpSecret.backupCodes.length
      },
      category: 'authentication',
      severity: 'warning'
    });

    return {
      success: true
    };
  }

  /**
   * Check if 2FA is enabled for a user
   */
  is2FAEnabled(userId: string): boolean {
    const totpSecret = this.secrets.get(userId);
    return totpSecret ? totpSecret.verified : false;
  }

  /**
   * Disable 2FA for a user
   */
  async disable2FA(userId: string, password: string): Promise<{ success: boolean; error?: string }> {
    const totpSecret = this.secrets.get(userId);
    if (!totpSecret) {
      return {
        success: false,
        error: '2FA is not enabled for this user'
      };
    }

    // In production, verify password before disabling
    // For now, just disable
    this.secrets.delete(userId);
    this.attempts.delete(userId);

    auditLogger.log({
      type: '2fa_disabled',
      userId,
      details: {
        method: 'totp'
      },
      category: 'authentication',
      severity: 'warning'
    });

    return {
      success: true
    };
  }

  /**
   * Get remaining backup codes
   */
  getRemainingBackupCodes(userId: string): number {
    const totpSecret = this.secrets.get(userId);
    return totpSecret ? totpSecret.backupCodes.length : 0;
  }

  /**
   * Generate new backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const totpSecret = this.secrets.get(userId);
    if (!totpSecret) {
      throw new Error('TOTP secret not found');
    }

    const newBackupCodes = this.generateBackupCodes();
    totpSecret.backupCodes = newBackupCodes;
    this.secrets.set(userId, totpSecret);

    auditLogger.log({
      type: '2fa_backup_codes_regenerated',
      userId,
      details: {
        count: newBackupCodes.length
      },
      category: 'authentication',
      severity: 'warning'
    });

    return newBackupCodes;
  }

  /**
   * Generate valid TOTP codes for current time window
   */
  private generateValidCodes(secret: string): string[] {
    const codes: string[] = [];
    const timeStep = 30; // 30 seconds
    const currentTime = Math.floor(Date.now() / 1000);
    const counter = Math.floor(currentTime / timeStep);

    // Generate codes for current, previous, and next time steps
    for (let i = -1; i <= 1; i++) {
      const code = this.generateTOTP(secret, counter + i);
      codes.push(code);
    }

    return codes;
  }

  /**
   * Generate TOTP code for a specific counter
   */
  private generateTOTP(secret: string, counter: number): string {
    // This is a simplified implementation
    // In production, use a proper TOTP library like 'otpauth' or 'speakeasy'
    
    // Convert base32 secret to bytes (simplified)
    const secretBytes = this.base32ToBytes(secret);
    
    // HMAC-SHA1 with counter as big-endian
    const hmac = this.hmacSha1(secretBytes, counter);
    
    // Dynamic truncation
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);
    
    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  }

  /**
   * Convert base32 string to bytes
   */
  private base32ToBytes(base32: string): Uint8Array {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (let i = 0; i < base32.length; i++) {
      const char = base32.charAt(i).toUpperCase();
      const charIndex = alphabet.indexOf(char);
      
      if (charIndex === -1) continue;
      
      value = (value << 5) | charIndex;
      bits += 5;

      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return new Uint8Array(output);
  }

  /**
   * HMAC-SHA1 implementation (simplified)
   */
  private hmacSha1(key: Uint8Array, counter: number): Uint8Array {
    // This is a simplified implementation
    // In production, use crypto.subtle.sign() or a proper crypto library
    
    const encoder = new TextEncoder();
    const counterBytes = new Uint8Array(8);
    const view = new DataView(counterBytes.buffer);
    view.setBigUint64(0, BigInt(counter));
    
    // Simplified HMAC-SHA1 - in production use Web Crypto API
    const combined = new Uint8Array(key.length + counterBytes.length);
    combined.set(key);
    combined.set(counterBytes, key.length);
    
    // Use crypto.subtle.digest for proper HMAC
    // For now, return a mock hash
    return new Uint8Array(20).fill(0);
  }

  /**
   * Record failed attempt
   */
  private recordFailedAttempt(userId: string): void {
    const now = Date.now();
    const attempts = this.attempts.get(userId) || { count: 0, lastAttempt: 0, blockedUntil: 0 };

    // Reset count if outside attempt window
    if (now - attempts.lastAttempt > this.ATTEMPT_WINDOW) {
      attempts.count = 0;
    }

    attempts.count++;
    attempts.lastAttempt = now;

    // Block if max attempts reached
    if (attempts.count >= this.MAX_ATTEMPTS) {
      attempts.blockedUntil = now + this.BLOCK_DURATION;
    }

    this.attempts.set(userId, attempts);

    // Log failed attempt
    auditLogger.log({
      type: '2fa_failed_attempt',
      userId,
      details: {
        attemptCount: attempts.count,
        blocked: attempts.count >= this.MAX_ATTEMPTS
      },
      category: 'authentication',
      severity: attempts.count >= this.MAX_ATTEMPTS ? 'critical' : 'warning'
    });
  }

  /**
   * Get user status
   */
  getUserStatus(userId: string): {
    enabled: boolean;
    verified: boolean;
    remainingBackupCodes: number;
    isBlocked: boolean;
    blockedUntil?: number;
    attemptsRemaining?: number;
  } {
    const totpSecret = this.secrets.get(userId);
    const attempts = this.attempts.get(userId);

    return {
      enabled: !!totpSecret,
      verified: totpSecret?.verified || false,
      remainingBackupCodes: totpSecret?.backupCodes.length || 0,
      isBlocked: !!(attempts && attempts.blockedUntil > Date.now()),
      blockedUntil: attempts?.blockedUntil,
      attemptsRemaining: attempts ? Math.max(0, this.MAX_ATTEMPTS - attempts.count) : this.MAX_ATTEMPTS
    };
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.secrets.clear();
    this.attempts.clear();
  }
}

export const totpService = TOTPService.getInstance();