/**
 * Key Management Service
 * 
 * Secure key management system for encryption keys, API keys, and secrets
 * with support for key rotation, HSM integration, and compliance requirements.
 */

import crypto from 'crypto';
import { safeLogger } from '../utils/safeLogger';
import { securityConfig } from '../config/securityConfig';
import { safeLogger } from '../utils/safeLogger';
import AuditLoggingService from './auditLoggingService';
import { safeLogger } from '../utils/safeLogger';

const auditLoggingService = new AuditLoggingService();
import { encryptionService } from './encryptionService';
import { safeLogger } from '../utils/safeLogger';

export interface KeyMetadata {
  id: string;
  type: KeyType;
  algorithm: string;
  keySize: number;
  purpose: string[];
  createdAt: Date;
  expiresAt?: Date;
  rotatedAt?: Date;
  status: KeyStatus;
  version: number;
  tags: Record<string, string>;
}

export interface KeyRotationPolicy {
  keyType: KeyType;
  rotationInterval: number; // milliseconds
  maxKeyAge: number; // milliseconds
  retainOldVersions: number;
  autoRotate: boolean;
  notifyBeforeExpiry: number; // milliseconds
}

export enum KeyType {
  ENCRYPTION = 'encryption',
  SIGNING = 'signing',
  API_KEY = 'api_key',
  JWT_SECRET = 'jwt_secret',
  DATABASE_ENCRYPTION = 'database_encryption',
  BLOCKCHAIN_PRIVATE_KEY = 'blockchain_private_key',
  WEBHOOK_SECRET = 'webhook_secret',
  SESSION_SECRET = 'session_secret',
}

export enum KeyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  COMPROMISED = 'compromised',
  PENDING_ROTATION = 'pending_rotation',
  ARCHIVED = 'archived',
}

export interface KeyUsageLog {
  keyId: string;
  operation: string;
  timestamp: Date;
  userId?: string;
  ipAddress?: string;
  success: boolean;
  details?: Record<string, any>;
}

export interface HSMConfig {
  enabled: boolean;
  provider: 'aws-kms' | 'azure-keyvault' | 'hashicorp-vault' | 'local';
  endpoint?: string;
  credentials?: Record<string, string>;
  keySpec?: string;
}

class KeyManagementService {
  private keys: Map<string, KeyMetadata> = new Map();
  private keyData: Map<string, Buffer> = new Map(); // In production, this would be in HSM
  private rotationPolicies: Map<KeyType, KeyRotationPolicy> = new Map();
  private usageLogs: KeyUsageLog[] = [];
  private hsmConfig: HSMConfig;

  constructor() {
    this.hsmConfig = {
      enabled: process.env.HSM_ENABLED === 'true',
      provider: (process.env.HSM_PROVIDER as any) || 'local',
      endpoint: process.env.HSM_ENDPOINT,
      credentials: {
        accessKey: process.env.HSM_ACCESS_KEY || '',
        secretKey: process.env.HSM_SECRET_KEY || '',
      },
    };

    this.initializeDefaultPolicies();
    this.startRotationScheduler();
  }

  /**
   * Generate a new key
   */
  async generateKey(params: {
    type: KeyType;
    algorithm?: string;
    keySize?: number;
    purpose: string[];
    expiresAt?: Date;
    tags?: Record<string, string>;
  }): Promise<KeyMetadata> {
    const keyId = crypto.randomUUID();
    const algorithm = params.algorithm || this.getDefaultAlgorithm(params.type);
    const keySize = params.keySize || this.getDefaultKeySize(params.type);

    // Generate the actual key material
    const keyMaterial = await this.generateKeyMaterial(params.type, algorithm, keySize);

    const metadata: KeyMetadata = {
      id: keyId,
      type: params.type,
      algorithm,
      keySize,
      purpose: params.purpose,
      createdAt: new Date(),
      expiresAt: params.expiresAt,
      status: KeyStatus.ACTIVE,
      version: 1,
      tags: params.tags || {},
    };

    // Store key metadata and material
    this.keys.set(keyId, metadata);
    
    if (this.hsmConfig.enabled) {
      await this.storeKeyInHSM(keyId, keyMaterial);
    } else {
      // Encrypt key material before storing
      const encryptedKey = await this.encryptKeyMaterial(keyMaterial);
      this.keyData.set(keyId, encryptedKey);
    }

    // Log key generation
    await auditLoggingService.createAuditLog({
      actionType: 'key_generated',
      actorType: 'system',
      newState: {
        keyId,
        keyType: params.type,
        algorithm,
        keySize,
        purpose: params.purpose,
      },
    });

    await this.logKeyUsage({
      keyId,
      operation: 'generate',
      timestamp: new Date(),
      success: true,
    });

    return metadata;
  }

  /**
   * Retrieve a key
   */
  async getKey(keyId: string, userId?: string): Promise<Buffer | null> {
    const metadata = this.keys.get(keyId);
    if (!metadata) {
      await this.logKeyUsage({
        keyId,
        operation: 'get',
        timestamp: new Date(),
        userId,
        success: false,
        details: { error: 'Key not found' },
      });
      return null;
    }

    // Check key status
    if (metadata.status !== KeyStatus.ACTIVE) {
      await this.logKeyUsage({
        keyId,
        operation: 'get',
        timestamp: new Date(),
        userId,
        success: false,
        details: { error: 'Key not active', status: metadata.status },
      });
      return null;
    }

    // Check expiration
    if (metadata.expiresAt && metadata.expiresAt < new Date()) {
      metadata.status = KeyStatus.EXPIRED;
      await this.logKeyUsage({
        keyId,
        operation: 'get',
        timestamp: new Date(),
        userId,
        success: false,
        details: { error: 'Key expired' },
      });
      return null;
    }

    let keyMaterial: Buffer;

    if (this.hsmConfig.enabled) {
      keyMaterial = await this.retrieveKeyFromHSM(keyId);
    } else {
      const encryptedKey = this.keyData.get(keyId);
      if (!encryptedKey) {
        return null;
      }
      keyMaterial = await this.decryptKeyMaterial(encryptedKey);
    }

    await this.logKeyUsage({
      keyId,
      operation: 'get',
      timestamp: new Date(),
      userId,
      success: true,
    });

    return keyMaterial;
  }

  /**
   * Rotate a key
   */
  async rotateKey(keyId: string, userId?: string): Promise<KeyMetadata> {
    const oldMetadata = this.keys.get(keyId);
    if (!oldMetadata) {
      throw new Error('Key not found');
    }

    // Generate new key with same parameters
    const newMetadata = await this.generateKey({
      type: oldMetadata.type,
      algorithm: oldMetadata.algorithm,
      keySize: oldMetadata.keySize,
      purpose: oldMetadata.purpose,
      expiresAt: oldMetadata.expiresAt,
      tags: oldMetadata.tags,
    });

    // Update version
    newMetadata.version = oldMetadata.version + 1;
    newMetadata.rotatedAt = new Date();

    // Mark old key as inactive
    oldMetadata.status = KeyStatus.INACTIVE;
    oldMetadata.rotatedAt = new Date();

    // Update storage
    this.keys.set(keyId, oldMetadata);
    this.keys.set(newMetadata.id, newMetadata);

    // Log rotation
    await auditLoggingService.createAuditLog({
      actionType: 'key_rotated',
      actorId: userId,
      actorType: userId ? 'user' : 'system',
      newState: {
        oldKeyId: keyId,
        newKeyId: newMetadata.id,
        keyType: oldMetadata.type,
        version: newMetadata.version,
      },
    });

    await this.logKeyUsage({
      keyId: newMetadata.id,
      operation: 'rotate',
      timestamp: new Date(),
      userId,
      success: true,
      details: { oldKeyId: keyId },
    });

    return newMetadata;
  }

  /**
   * Revoke a key
   */
  async revokeKey(keyId: string, reason: string, userId?: string): Promise<void> {
    const metadata = this.keys.get(keyId);
    if (!metadata) {
      throw new Error('Key not found');
    }

    metadata.status = KeyStatus.COMPROMISED;

    // Remove key material
    if (this.hsmConfig.enabled) {
      await this.deleteKeyFromHSM(keyId);
    } else {
      this.keyData.delete(keyId);
    }

    // Log revocation
    await auditLoggingService.createAuditLog({
      actionType: 'key_revoked',
      actorId: userId,
      actorType: userId ? 'user' : 'system',
      newState: {
        keyId,
        keyType: metadata.type,
        reason,
        revokedAt: new Date(),
      },
    });

    await this.logKeyUsage({
      keyId,
      operation: 'revoke',
      timestamp: new Date(),
      userId,
      success: true,
      details: { reason },
    });
  }

  /**
   * List keys with filtering
   */
  listKeys(filter?: {
    type?: KeyType;
    status?: KeyStatus;
    purpose?: string;
    tags?: Record<string, string>;
  }): KeyMetadata[] {
    let keys = Array.from(this.keys.values());

    if (filter) {
      if (filter.type) {
        keys = keys.filter(key => key.type === filter.type);
      }
      if (filter.status) {
        keys = keys.filter(key => key.status === filter.status);
      }
      if (filter.purpose) {
        keys = keys.filter(key => key.purpose.includes(filter.purpose));
      }
      if (filter.tags) {
        keys = keys.filter(key => {
          return Object.entries(filter.tags!).every(([tagKey, tagValue]) => 
            key.tags[tagKey] === tagValue
          );
        });
      }
    }

    return keys.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Set key rotation policy
   */
  setRotationPolicy(keyType: KeyType, policy: Omit<KeyRotationPolicy, 'keyType'>): void {
    this.rotationPolicies.set(keyType, {
      keyType,
      ...policy,
    });
  }

  /**
   * Get key usage statistics
   */
  getKeyUsageStats(keyId: string): {
    totalUsage: number;
    recentUsage: number;
    lastUsed?: Date;
    operationCounts: Record<string, number>;
  } {
    const logs = this.usageLogs.filter(log => log.keyId === keyId);
    const recentLogs = logs.filter(log => 
      log.timestamp.getTime() > Date.now() - (24 * 60 * 60 * 1000) // Last 24 hours
    );

    const operationCounts: Record<string, number> = {};
    logs.forEach(log => {
      operationCounts[log.operation] = (operationCounts[log.operation] || 0) + 1;
    });

    return {
      totalUsage: logs.length,
      recentUsage: recentLogs.length,
      lastUsed: logs.length > 0 ? logs[logs.length - 1].timestamp : undefined,
      operationCounts,
    };
  }

  /**
   * Check keys for rotation
   */
  async checkKeysForRotation(): Promise<void> {
    const now = new Date();

    for (const [keyId, metadata] of this.keys.entries()) {
      if (metadata.status !== KeyStatus.ACTIVE) continue;

      const policy = this.rotationPolicies.get(metadata.type);
      if (!policy || !policy.autoRotate) continue;

      const keyAge = now.getTime() - metadata.createdAt.getTime();
      const shouldRotate = keyAge >= policy.rotationInterval;

      if (shouldRotate) {
        try {
          metadata.status = KeyStatus.PENDING_ROTATION;
          await this.rotateKey(keyId);
          safeLogger.info(`Auto-rotated key ${keyId} of type ${metadata.type}`);
        } catch (error) {
          safeLogger.error(`Failed to auto-rotate key ${keyId}:`, error);
        }
      } else if (keyAge >= policy.rotationInterval - policy.notifyBeforeExpiry) {
        // Notify about upcoming rotation
        safeLogger.warn(`Key ${keyId} of type ${metadata.type} will expire soon`);
      }
    }
  }

  /**
   * Export key for backup (encrypted)
   */
  async exportKey(keyId: string, userId: string): Promise<string> {
    const metadata = this.keys.get(keyId);
    if (!metadata) {
      throw new Error('Key not found');
    }

    const keyMaterial = await this.getKey(keyId, userId);
    if (!keyMaterial) {
      throw new Error('Failed to retrieve key material');
    }

    // Create export package
    const exportData = {
      metadata,
      keyMaterial: keyMaterial.toString('base64'),
      exportedAt: new Date(),
      exportedBy: userId,
    };

    // Encrypt export package
    const { encryptedContent } = await encryptionService.encryptContent(
      Buffer.from(JSON.stringify(exportData))
    );

    await auditLoggingService.createAuditLog({
      actionType: 'key_exported',
      actorId: userId,
      actorType: 'user',
      newState: { keyId, exportedAt: new Date() },
    });

    return encryptedContent.toString('base64');
  }

  /**
   * Import key from backup
   */
  async importKey(encryptedExport: string, encryptionKey: string, userId: string): Promise<KeyMetadata> {
    try {
      // Decrypt export package
      const encryptedBuffer = Buffer.from(encryptedExport, 'base64');
      const decryptedContent = await encryptionService.decryptContent(encryptedBuffer, encryptionKey);
      const exportData = JSON.parse(decryptedContent.toString());

      // Validate export data
      if (!exportData.metadata || !exportData.keyMaterial) {
        throw new Error('Invalid export data');
      }

      const metadata: KeyMetadata = {
        ...exportData.metadata,
        id: crypto.randomUUID(), // Generate new ID
        createdAt: new Date(),
        status: KeyStatus.ACTIVE,
      };

      const keyMaterial = Buffer.from(exportData.keyMaterial, 'base64');

      // Store imported key
      this.keys.set(metadata.id, metadata);
      
      if (this.hsmConfig.enabled) {
        await this.storeKeyInHSM(metadata.id, keyMaterial);
      } else {
        const encryptedKey = await this.encryptKeyMaterial(keyMaterial);
        this.keyData.set(metadata.id, encryptedKey);
      }

      await auditLoggingService.createAuditLog({
        actionType: 'key_imported',
        actorId: userId,
        actorType: 'user',
        newState: { keyId: metadata.id, originalId: exportData.metadata.id },
      });

      return metadata;
    } catch (error) {
      throw new Error(`Failed to import key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private methods
  private initializeDefaultPolicies(): void {
    // Set default rotation policies
    this.setRotationPolicy(KeyType.JWT_SECRET, {
      rotationInterval: 30 * 24 * 60 * 60 * 1000, // 30 days
      maxKeyAge: 90 * 24 * 60 * 60 * 1000, // 90 days
      retainOldVersions: 3,
      autoRotate: true,
      notifyBeforeExpiry: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    this.setRotationPolicy(KeyType.ENCRYPTION, {
      rotationInterval: 90 * 24 * 60 * 60 * 1000, // 90 days
      maxKeyAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      retainOldVersions: 5,
      autoRotate: true,
      notifyBeforeExpiry: 14 * 24 * 60 * 60 * 1000, // 14 days
    });

    this.setRotationPolicy(KeyType.API_KEY, {
      rotationInterval: 60 * 24 * 60 * 60 * 1000, // 60 days
      maxKeyAge: 180 * 24 * 60 * 60 * 1000, // 180 days
      retainOldVersions: 2,
      autoRotate: false, // Manual rotation for API keys
      notifyBeforeExpiry: 14 * 24 * 60 * 60 * 1000, // 14 days
    });
  }

  private startRotationScheduler(): void {
    // Check for key rotation every hour
    setInterval(() => {
      this.checkKeysForRotation().catch(error => {
        safeLogger.error('Key rotation check failed:', error);
      });
    }, 60 * 60 * 1000); // 1 hour
  }

  private async generateKeyMaterial(type: KeyType, algorithm: string, keySize: number): Promise<Buffer> {
    switch (type) {
      case KeyType.ENCRYPTION:
      case KeyType.DATABASE_ENCRYPTION:
        return crypto.randomBytes(keySize / 8);
      
      case KeyType.SIGNING:
        // Generate RSA key pair
        const { privateKey } = crypto.generateKeyPairSync('rsa', {
          modulusLength: keySize,
          privateKeyEncoding: { type: 'pkcs8', format: 'der' },
          publicKeyEncoding: { type: 'spki', format: 'der' },
        });
        return privateKey;
      
      case KeyType.JWT_SECRET:
      case KeyType.SESSION_SECRET:
      case KeyType.WEBHOOK_SECRET:
        return crypto.randomBytes(64); // 512 bits
      
      case KeyType.API_KEY:
        return Buffer.from(crypto.randomUUID().replace(/-/g, ''));
      
      case KeyType.BLOCKCHAIN_PRIVATE_KEY:
        return crypto.randomBytes(32); // 256 bits for secp256k1
      
      default:
        return crypto.randomBytes(keySize / 8);
    }
  }

  private getDefaultAlgorithm(type: KeyType): string {
    switch (type) {
      case KeyType.ENCRYPTION:
      case KeyType.DATABASE_ENCRYPTION:
        return 'aes-256-gcm';
      case KeyType.SIGNING:
        return 'rsa-sha256';
      case KeyType.BLOCKCHAIN_PRIVATE_KEY:
        return 'secp256k1';
      default:
        return 'aes-256-gcm';
    }
  }

  private getDefaultKeySize(type: KeyType): number {
    switch (type) {
      case KeyType.ENCRYPTION:
      case KeyType.DATABASE_ENCRYPTION:
        return 256;
      case KeyType.SIGNING:
        return 2048;
      case KeyType.BLOCKCHAIN_PRIVATE_KEY:
        return 256;
      default:
        return 256;
    }
  }

  private async encryptKeyMaterial(keyMaterial: Buffer): Promise<Buffer> {
    const masterKey = Buffer.from(process.env.MASTER_ENCRYPTION_KEY || '', 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', masterKey);
    
    const encrypted = Buffer.concat([
      cipher.update(keyMaterial),
      cipher.final(),
    ]);
    
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]);
  }

  private async decryptKeyMaterial(encryptedKey: Buffer): Promise<Buffer> {
    const masterKey = Buffer.from(process.env.MASTER_ENCRYPTION_KEY || '', 'hex');
    const iv = encryptedKey.subarray(0, 16);
    const tag = encryptedKey.subarray(16, 32);
    const encrypted = encryptedKey.subarray(32);
    
    const decipher = crypto.createDecipher('aes-256-gcm', masterKey);
    decipher.setAuthTag(tag);
    
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
  }

  private async logKeyUsage(log: KeyUsageLog): Promise<void> {
    this.usageLogs.push(log);
    
    // Keep only recent logs (last 30 days)
    const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
    this.usageLogs = this.usageLogs.filter(l => l.timestamp.getTime() > cutoff);
  }

  // HSM integration methods (placeholder implementations)
  private async storeKeyInHSM(keyId: string, keyMaterial: Buffer): Promise<void> {
    // Implementation would integrate with actual HSM
    safeLogger.info(`Storing key ${keyId} in HSM`);
  }

  private async retrieveKeyFromHSM(keyId: string): Promise<Buffer> {
    // Implementation would retrieve from actual HSM
    throw new Error('HSM integration not implemented');
  }

  private async deleteKeyFromHSM(keyId: string): Promise<void> {
    // Implementation would delete from actual HSM
    safeLogger.info(`Deleting key ${keyId} from HSM`);
  }
}

export const keyManagementService = new KeyManagementService();
export default keyManagementService;