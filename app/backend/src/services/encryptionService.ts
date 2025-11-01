import crypto from 'crypto';
import { safeLogger } from '../utils/safeLogger';

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16; // 128 bits
  
  /**
   * Encrypt content with AES-256-GCM
   */
  async encryptContent(content: Buffer | Uint8Array): Promise<{ encryptedContent: Buffer; encryptionKey: string }> {
    try {
      // Generate random encryption key and IV
      const encryptionKey = crypto.randomBytes(this.keyLength);
      const iv = crypto.randomBytes(this.ivLength);
      
      // Create cipher
      const cipher = crypto.createCipher(this.algorithm, encryptionKey);
      cipher.setAAD(Buffer.from('digital-asset-drm'));
      
      // Encrypt content
      const encrypted = Buffer.concat([
        cipher.update(Buffer.from(content)),
        cipher.final()
      ]);
      
      // Get authentication tag
      const tag = cipher.getAuthTag();
      
      // Combine IV, tag, and encrypted content
      const encryptedContent = Buffer.concat([iv, tag, encrypted]);
      
      return {
        encryptedContent,
        encryptionKey: encryptionKey.toString('hex')
      };
    } catch (error) {
      safeLogger.error('Error encrypting content:', error);
      throw new Error('Failed to encrypt content');
    }
  }
  
  /**
   * Decrypt content with AES-256-GCM
   */
  async decryptContent(encryptedContent: Buffer, encryptionKey: string): Promise<Buffer> {
    try {
      // Extract IV, tag, and encrypted data
      const iv = encryptedContent.subarray(0, this.ivLength);
      const tag = encryptedContent.subarray(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = encryptedContent.subarray(this.ivLength + this.tagLength);
      
      // Create decipher
      const decipher = crypto.createDecipher(this.algorithm, Buffer.from(encryptionKey, 'hex'));
      decipher.setAAD(Buffer.from('digital-asset-drm'));
      decipher.setAuthTag(tag);
      
      // Decrypt content
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      return decrypted;
    } catch (error) {
      safeLogger.error('Error decrypting content:', error);
      throw new Error('Failed to decrypt content');
    }
  }
  
  /**
   * Encrypt a key for secure storage
   */
  async encryptKey(key: string): Promise<string> {
    try {
      const masterKey = this.getMasterKey();
      const iv = crypto.randomBytes(this.ivLength);
      
      const cipher = crypto.createCipher(this.algorithm, masterKey);
      const encrypted = Buffer.concat([
        cipher.update(Buffer.from(key, 'utf8')),
        cipher.final()
      ]);
      
      const tag = cipher.getAuthTag();
      const result = Buffer.concat([iv, tag, encrypted]);
      
      return result.toString('base64');
    } catch (error) {
      safeLogger.error('Error encrypting key:', error);
      throw new Error('Failed to encrypt key');
    }
  }
  
  /**
   * Decrypt a key from secure storage
   */
  async decryptKey(encryptedKey: string): Promise<string> {
    try {
      const masterKey = this.getMasterKey();
      const data = Buffer.from(encryptedKey, 'base64');
      
      const iv = data.subarray(0, this.ivLength);
      const tag = data.subarray(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = data.subarray(this.ivLength + this.tagLength);
      
      const decipher = crypto.createDecipher(this.algorithm, masterKey);
      decipher.setAuthTag(tag);
      
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      safeLogger.error('Error decrypting key:', error);
      throw new Error('Failed to decrypt key');
    }
  }
  
  /**
   * Store encryption key securely (placeholder for KMS integration)
   */
  async storeKey(assetId: string, encryptionKey: string): Promise<void> {
    try {
      // In production, this would integrate with AWS KMS, HashiCorp Vault, etc.
      // For now, we'll use environment-based encryption
      const encryptedKey = await this.encryptKey(encryptionKey);
      
      // Store in secure key-value store (Redis with encryption, database, etc.)
      // This is a placeholder - implement based on your infrastructure
      process.env[`ASSET_KEY_${assetId}`] = encryptedKey;
    } catch (error) {
      safeLogger.error('Error storing key:', error);
      throw new Error('Failed to store encryption key');
    }
  }
  
  /**
   * Retrieve encryption key securely
   */
  async getKey(assetId: string): Promise<string> {
    try {
      // Retrieve from secure key-value store
      const encryptedKey = process.env[`ASSET_KEY_${assetId}`];
      
      if (!encryptedKey) {
        throw new Error('Encryption key not found');
      }
      
      return await this.decryptKey(encryptedKey);
    } catch (error) {
      safeLogger.error('Error retrieving key:', error);
      throw new Error('Failed to retrieve encryption key');
    }
  }
  
  /**
   * Generate content fingerprint for duplicate detection
   */
  generateContentFingerprint(content: Buffer): string {
    // Create a perceptual hash for content similarity detection
    // This is a simplified version - in production, use specialized libraries
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    
    // Take first 16 characters for fingerprint
    return hash.substring(0, 16);
  }
  
  /**
   * Generate secure license key
   */
  generateLicenseKey(assetId: string, buyerId: string, timestamp: number): string {
    const data = `${assetId}:${buyerId}:${timestamp}`;
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    
    // Format as license key with dashes
    return [
      hash.substring(0, 8),
      hash.substring(8, 16),
      hash.substring(16, 24),
      hash.substring(24, 32)
    ].join('-').toUpperCase();
  }
  
  /**
   * Verify content integrity
   */
  verifyContentIntegrity(content: Buffer, expectedHash: string): boolean {
    const actualHash = crypto.createHash('sha256').update(content).digest('hex');
    return actualHash === expectedHash;
  }
  
  /**
   * Create digital signature for content authenticity
   */
  signContent(content: Buffer, privateKey: string): string {
    try {
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(content);
      return sign.sign(privateKey, 'base64');
    } catch (error) {
      safeLogger.error('Error signing content:', error);
      throw new Error('Failed to sign content');
    }
  }
  
  /**
   * Verify digital signature
   */
  verifySignature(content: Buffer, signature: string, publicKey: string): boolean {
    try {
      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(content);
      return verify.verify(publicKey, signature, 'base64');
    } catch (error) {
      safeLogger.error('Error verifying signature:', error);
      return false;
    }
  }
  
  /**
   * Generate time-limited access token
   */
  generateAccessToken(assetId: string, userId: string, expirationMinutes: number = 60): string {
    const payload = {
      assetId,
      userId,
      exp: Math.floor(Date.now() / 1000) + (expirationMinutes * 60),
      iat: Math.floor(Date.now() / 1000)
    };
    
    const token = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = crypto.createHmac('sha256', this.getTokenSecret())
      .update(token)
      .digest('base64');
    
    return `${token}.${signature}`;
  }
  
  /**
   * Verify access token
   */
  verifyAccessToken(token: string): { assetId: string; userId: string } | null {
    try {
      const [tokenData, signature] = token.split('.');
      
      // Verify signature
      const expectedSignature = crypto.createHmac('sha256', this.getTokenSecret())
        .update(tokenData)
        .digest('base64');
      
      if (signature !== expectedSignature) {
        return null;
      }
      
      // Parse payload
      const payload = JSON.parse(Buffer.from(tokenData, 'base64').toString());
      
      // Check expiration
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }
      
      return {
        assetId: payload.assetId,
        userId: payload.userId
      };
    } catch (error) {
      safeLogger.error('Error verifying access token:', error);
      return null;
    }
  }
  
  private getMasterKey(): Buffer {
    const masterKeyHex = process.env.MASTER_ENCRYPTION_KEY;
    if (!masterKeyHex) {
      throw new Error('Master encryption key not configured');
    }
    return Buffer.from(masterKeyHex, 'hex');
  }
  
  private getTokenSecret(): string {
    const secret = process.env.TOKEN_SECRET;
    if (!secret) {
      throw new Error('Token secret not configured');
    }
    return secret;
  }
}

export const encryptionService = new EncryptionService();
