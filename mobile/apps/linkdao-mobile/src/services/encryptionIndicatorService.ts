/**
 * Encryption Indicator Service
 * 
 * Provides encryption status and indicators for messaging.
 * 
 * Features:
 * - End-to-end encryption status
 * - Encryption key management
 * - Encryption verification
 * - Encryption level display
 * - Security indicators
 */

import { Platform } from 'react-native';

// Encryption level
export enum EncryptionLevel {
  NONE = 'none',
  BASIC = 'basic',
  STANDARD = 'standard',
  ADVANCED = 'advanced',
  MAXIMUM = 'maximum',
}

// Encryption status
export enum EncryptionStatus {
  NOT_ENCRYPTED = 'not_encrypted',
  ENCRYPTED = 'encrypted',
  ENCRYPTED_VERIFIED = 'encrypted_verified',
  ENCRYPTED_UNVERIFIED = 'encrypted_unverified',
  ENCRYPTION_ERROR = 'encryption_error',
}

// Encryption algorithm
export enum EncryptionAlgorithm {
  AES_256_GCM = 'aes_256_gcm',
  CHACHA20_POLY1305 = 'chacha20_poly1305',
  X25519 = 'x25519',
  ED25519 = 'ed25519',
}

// Encryption key info
export interface EncryptionKey {
  id: string;
  publicKey: string;
  fingerprint: string;
  algorithm: EncryptionAlgorithm;
  created: Date;
  expires?: Date;
  verified: boolean;
}

// Encryption info
export interface EncryptionInfo {
  level: EncryptionLevel;
  status: EncryptionStatus;
  algorithm: EncryptionAlgorithm;
  keyId: string;
  fingerprint: string;
  verified: boolean;
  lastRotated: Date;
  expires?: Date;
}

// Message encryption status
export interface MessageEncryptionStatus {
  messageId: string;
  encrypted: boolean;
  encryptionLevel: EncryptionLevel;
  algorithm: EncryptionAlgorithm;
  verified: boolean;
  timestamp: Date;
}

// Conversation encryption status
export interface ConversationEncryptionStatus {
  conversationId: string;
  participants: string[];
  encryptionEnabled: boolean;
  encryptionLevel: EncryptionLevel;
  encryptionStatus: EncryptionStatus;
  verifiedParticipants: string[];
  unverifiedParticipants: string[];
  keyRotationRequired: boolean;
  lastKeyRotation: Date;
}

class EncryptionIndicatorService {
  private encryptionKeys: Map<string, EncryptionKey> = new Map();
  private conversationEncryptionStatus: Map<string, ConversationEncryptionStatus> = new Map();

  /**
   * Get encryption level for conversation
   */
  async getConversationEncryptionLevel(
    conversationId: string
  ): Promise<EncryptionLevel> {
    try {
      const status = await this.getConversationEncryptionStatus(conversationId);
      return status.encryptionLevel;
    } catch (error) {
      console.error('Error getting conversation encryption level:', error);
      return EncryptionLevel.NONE;
    }
  }

  /**
   * Get encryption status for conversation
   */
  async getConversationEncryptionStatus(
    conversationId: string
  ): Promise<ConversationEncryptionStatus> {
    try {
      // Check cache first
      const cached = this.conversationEncryptionStatus.get(conversationId);
      if (cached) {
        return cached;
      }

      // In a real implementation, this would fetch from the backend
      const status: ConversationEncryptionStatus = {
        conversationId,
        participants: [],
        encryptionEnabled: true,
        encryptionLevel: EncryptionLevel.ADVANCED,
        encryptionStatus: EncryptionStatus.ENCRYPTED_VERIFIED,
        verifiedParticipants: [],
        unverifiedParticipants: [],
        keyRotationRequired: false,
        lastKeyRotation: new Date(),
      };

      this.conversationEncryptionStatus.set(conversationId, status);
      return status;
    } catch (error) {
      console.error('Error getting conversation encryption status:', error);
      throw new Error('Failed to get encryption status');
    }
  }

  /**
   * Get message encryption status
   */
  async getMessageEncryptionStatus(
    messageId: string
  ): Promise<MessageEncryptionStatus> {
    try {
      // In a real implementation, this would fetch from the backend
      const status: MessageEncryptionStatus = {
        messageId,
        encrypted: true,
        encryptionLevel: EncryptionLevel.ADVANCED,
        algorithm: EncryptionAlgorithm.AES_256_GCM,
        verified: true,
        timestamp: new Date(),
      };

      return status;
    } catch (error) {
      console.error('Error getting message encryption status:', error);
      throw new Error('Failed to get message encryption status');
    }
  }

  /**
   * Get encryption key info
   */
  async getEncryptionKey(keyId: string): Promise<EncryptionKey> {
    try {
      // Check cache first
      const cached = this.encryptionKeys.get(keyId);
      if (cached) {
        return cached;
      }

      // In a real implementation, this would fetch from the backend
      const key: EncryptionKey = {
        id: keyId,
        publicKey: '0x...',
        fingerprint: this.generateFingerprint(keyId),
        algorithm: EncryptionAlgorithm.AES_256_GCM,
        created: new Date(),
        verified: true,
      };

      this.encryptionKeys.set(keyId, key);
      return key;
    } catch (error) {
      console.error('Error getting encryption key:', error);
      throw new Error('Failed to get encryption key');
    }
  }

  /**
   * Generate encryption key
   */
  async generateEncryptionKey(
    algorithm: EncryptionAlgorithm = EncryptionAlgorithm.AES_256_GCM
  ): Promise<EncryptionKey> {
    try {
      // In a real implementation, this would generate a new key pair
      const keyId = `key-${Date.now()}`;
      const key: EncryptionKey = {
        id: keyId,
        publicKey: this.generatePublicKey(),
        fingerprint: this.generateFingerprint(keyId),
        algorithm,
        created: new Date(),
        verified: false,
      };

      this.encryptionKeys.set(keyId, key);
      return key;
    } catch (error) {
      console.error('Error generating encryption key:', error);
      throw new Error('Failed to generate encryption key');
    }
  }

  /**
   * Verify encryption key
   */
  async verifyEncryptionKey(
    keyId: string,
    fingerprint: string
  ): Promise<boolean> {
    try {
      const key = await this.getEncryptionKey(keyId);
      const verified = key.fingerprint === fingerprint;

      if (verified) {
        key.verified = true;
        this.encryptionKeys.set(keyId, key);
      }

      return verified;
    } catch (error) {
      console.error('Error verifying encryption key:', error);
      throw new Error('Failed to verify encryption key');
    }
  }

  /**
   * Rotate encryption key
   */
  async rotateEncryptionKey(conversationId: string): Promise<EncryptionKey> {
    try {
      // Generate new key
      const newKey = await this.generateEncryptionKey();

      // Update conversation encryption status
      const status = this.conversationEncryptionStatus.get(conversationId);
      if (status) {
        status.lastKeyRotation = new Date();
        status.keyRotationRequired = false;
        this.conversationEncryptionStatus.set(conversationId, status);
      }

      return newKey;
    } catch (error) {
      console.error('Error rotating encryption key:', error);
      throw new Error('Failed to rotate encryption key');
    }
  }

  /**
   * Check if key rotation is required
   */
  async isKeyRotationRequired(conversationId: string): Promise<boolean> {
    try {
      const status = await this.getConversationEncryptionStatus(conversationId);
      return status.keyRotationRequired;
    } catch (error) {
      console.error('Error checking key rotation requirement:', error);
      return false;
    }
  }

  /**
   * Get encryption level name
   */
  getEncryptionLevelName(level: EncryptionLevel): string {
    const names: Record<EncryptionLevel, string> = {
      [EncryptionLevel.NONE]: 'Not Encrypted',
      [EncryptionLevel.BASIC]: 'Basic',
      [EncryptionLevel.STANDARD]: 'Standard',
      [EncryptionLevel.ADVANCED]: 'Advanced',
      [EncryptionLevel.MAXIMUM]: 'Maximum',
    };
    return names[level];
  }

  /**
   * Get encryption status name
   */
  getEncryptionStatusName(status: EncryptionStatus): string {
    const names: Record<EncryptionStatus, string> = {
      [EncryptionStatus.NOT_ENCRYPTED]: 'Not Encrypted',
      [EncryptionStatus.ENCRYPTED]: 'Encrypted',
      [EncryptionStatus.ENCRYPTED_VERIFIED]: 'Encrypted & Verified',
      [EncryptionStatus.ENCRYPTED_UNVERIFIED]: 'Encrypted (Unverified)',
      [EncryptionStatus.ENCRYPTION_ERROR]: 'Encryption Error',
    };
    return names[status];
  }

  /**
   * Get encryption status color
   */
  getEncryptionStatusColor(status: EncryptionStatus): string {
    const colors: Record<EncryptionStatus, string> = {
      [EncryptionStatus.NOT_ENCRYPTED]: '#ef4444', // Red
      [EncryptionStatus.ENCRYPTED]: '#3b82f6', // Blue
      [EncryptionStatus.ENCRYPTED_VERIFIED]: '#10b981', // Green
      [EncryptionStatus.ENCRYPTED_UNVERIFIED]: '#f59e0b', // Orange
      [EncryptionStatus.ENCRYPTION_ERROR]: '#ef4444', // Red
    };
    return colors[status];
  }

  /**
   * Get encryption level icon
   */
  getEncryptionLevelIcon(level: EncryptionLevel): string {
    const icons: Record<EncryptionLevel, string> = {
      [EncryptionLevel.NONE]: 'lock-open',
      [EncryptionLevel.BASIC]: 'lock-closed',
      [EncryptionLevel.STANDARD]: 'lock-closed',
      [EncryptionLevel.ADVANCED]: 'shield-checkmark',
      [EncryptionLevel.MAXIMUM]: 'shield-checkmark',
    };
    return icons[level];
  }

  /**
   * Get encryption algorithm name
   */
  getEncryptionAlgorithmName(algorithm: EncryptionAlgorithm): string {
    const names: Record<EncryptionAlgorithm, string> = {
      [EncryptionAlgorithm.AES_256_GCM]: 'AES-256-GCM',
      [EncryptionAlgorithm.CHACHA20_POLY1305]: 'ChaCha20-Poly1305',
      [EncryptionAlgorithm.X25519]: 'X25519',
      [EncryptionAlgorithm.ED25519]: 'Ed25519',
    };
    return names[algorithm];
  }

  /**
   * Is encryption enabled
   */
  isEncryptionEnabled(level: EncryptionLevel): boolean {
    return level !== EncryptionLevel.NONE;
  }

  /**
   * Is encryption verified
   */
  isEncryptionVerified(status: EncryptionStatus): boolean {
    return status === EncryptionStatus.ENCRYPTED_VERIFIED;
  }

  /**
   * Get encryption strength percentage
   */
  getEncryptionStrengthPercentage(level: EncryptionLevel): number {
    const percentages: Record<EncryptionLevel, number> = {
      [EncryptionLevel.NONE]: 0,
      [EncryptionLevel.BASIC]: 25,
      [EncryptionLevel.STANDARD]: 50,
      [EncryptionLevel.ADVANCED]: 75,
      [EncryptionLevel.MAXIMUM]: 100,
    };
    return percentages[level];
  }

  /**
   * Generate fingerprint
   */
  private generateFingerprint(keyId: string): string {
    // In a real implementation, this would generate a cryptographic fingerprint
    const hash = btoa(keyId).replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
    return hash.toUpperCase();
  }

  /**
   * Generate public key
   */
  private generatePublicKey(): string {
    // In a real implementation, this would generate a real public key
    const chars = '0123456789abcdef';
    let key = '0x';
    for (let i = 0; i < 64; i++) {
      key += chars[Math.floor(Math.random() * chars.length)];
    }
    return key;
  }

  /**
   * Get encryption tooltip text
   */
  getEncryptionTooltipText(
    level: EncryptionLevel,
    status: EncryptionStatus
  ): string {
    const levelName = this.getEncryptionLevelName(level);
    const statusName = this.getEncryptionStatusName(status);

    if (level === EncryptionLevel.NONE) {
      return 'Messages are not encrypted. Enable encryption for better security.';
    }

    if (status === EncryptionStatus.ENCRYPTED_VERIFIED) {
      return `${levelName} encryption with verified keys. Your messages are secure.`;
    }

    if (status === EncryptionStatus.ENCRYPTED_UNVERIFIED) {
      return `${levelName} encryption but keys are not verified. Verify keys for maximum security.`;
    }

    return `${statusName}`;
  }

  /**
   * Get encryption warning message
   */
  getEncryptionWarningMessage(
    level: EncryptionLevel,
    status: EncryptionStatus
  ): string | null {
    if (level === EncryptionLevel.NONE) {
      return 'Warning: Messages are not encrypted. Enable encryption to protect your conversations.';
    }

    if (status === EncryptionStatus.ENCRYPTED_UNVERIFIED) {
      return 'Warning: Encryption keys are not verified. Verify keys to ensure you\'re communicating with the right person.';
    }

    if (status === EncryptionStatus.ENCRYPTION_ERROR) {
      return 'Error: Encryption failed. Messages may not be secure.';
    }

    return null;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.encryptionKeys.clear();
    this.conversationEncryptionStatus.clear();
  }

  /**
   * Get all cached keys
   */
  getCachedKeys(): EncryptionKey[] {
    return Array.from(this.encryptionKeys.values());
  }

  /**
   * Get all cached conversation statuses
   */
  getCachedConversationStatuses(): ConversationEncryptionStatus[] {
    return Array.from(this.conversationEncryptionStatus.values());
  }
}

// Export singleton instance
export const encryptionIndicatorService = new EncryptionIndicatorService();

export default encryptionIndicatorService;