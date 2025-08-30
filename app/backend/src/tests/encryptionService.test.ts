import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { encryptionService } from '../services/encryptionService';
import crypto from 'crypto';

describe('EncryptionService', () => {
  const testContent = Buffer.from('This is test content for encryption');
  const testKey = 'test-encryption-key';
  const testAssetId = 'asset-123';
  const testUserId = 'user-123';
  
  beforeEach(() => {
    // Set up environment variables for testing
    process.env.MASTER_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    process.env.TOKEN_SECRET = 'test-token-secret';
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('encryptContent', () => {
    it('should encrypt content and return encrypted data with key', async () => {
      const result = await encryptionService.encryptContent(testContent);
      
      expect(result).toHaveProperty('encryptedContent');
      expect(result).toHaveProperty('encryptionKey');
      expect(result.encryptedContent).toBeInstanceOf(Buffer);
      expect(typeof result.encryptionKey).toBe('string');
      expect(result.encryptedContent.length).toBeGreaterThan(0);
      expect(result.encryptionKey.length).toBe(64); // 32 bytes in hex
    });
    
    it('should produce different encrypted content for same input', async () => {
      const result1 = await encryptionService.encryptContent(testContent);
      const result2 = await encryptionService.encryptContent(testContent);
      
      expect(result1.encryptedContent).not.toEqual(result2.encryptedContent);
      expect(result1.encryptionKey).not.toEqual(result2.encryptionKey);
    });
    
    it('should handle empty content', async () => {
      const emptyContent = Buffer.alloc(0);
      const result = await encryptionService.encryptContent(emptyContent);
      
      expect(result.encryptedContent).toBeInstanceOf(Buffer);
      expect(result.encryptionKey).toBeDefined();
    });
  });
  
  describe('decryptContent', () => {
    it('should decrypt content back to original', async () => {
      const { encryptedContent, encryptionKey } = await encryptionService.encryptContent(testContent);
      const decryptedContent = await encryptionService.decryptContent(encryptedContent, encryptionKey);
      
      expect(decryptedContent).toEqual(testContent);
    });
    
    it('should throw error with wrong encryption key', async () => {
      const { encryptedContent } = await encryptionService.encryptContent(testContent);
      const wrongKey = crypto.randomBytes(32).toString('hex');
      
      await expect(encryptionService.decryptContent(encryptedContent, wrongKey))
        .rejects.toThrow('Failed to decrypt content');
    });
    
    it('should throw error with corrupted encrypted content', async () => {
      const { encryptionKey } = await encryptionService.encryptContent(testContent);
      const corruptedContent = Buffer.from('corrupted data');
      
      await expect(encryptionService.decryptContent(corruptedContent, encryptionKey))
        .rejects.toThrow('Failed to decrypt content');
    });
  });
  
  describe('encryptKey and decryptKey', () => {
    it('should encrypt and decrypt keys correctly', async () => {
      const encryptedKey = await encryptionService.encryptKey(testKey);
      const decryptedKey = await encryptionService.decryptKey(encryptedKey);
      
      expect(decryptedKey).toBe(testKey);
      expect(encryptedKey).not.toBe(testKey);
    });
    
    it('should produce different encrypted keys for same input', async () => {
      const encrypted1 = await encryptionService.encryptKey(testKey);
      const encrypted2 = await encryptionService.encryptKey(testKey);
      
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to the same value
      const decrypted1 = await encryptionService.decryptKey(encrypted1);
      const decrypted2 = await encryptionService.decryptKey(encrypted2);
      
      expect(decrypted1).toBe(testKey);
      expect(decrypted2).toBe(testKey);
    });
  });
  
  describe('storeKey and getKey', () => {
    it('should store and retrieve encryption keys', async () => {
      await encryptionService.storeKey(testAssetId, testKey);
      const retrievedKey = await encryptionService.getKey(testAssetId);
      
      expect(retrievedKey).toBe(testKey);
    });
    
    it('should throw error when retrieving non-existent key', async () => {
      await expect(encryptionService.getKey('non-existent-asset'))
        .rejects.toThrow('Failed to retrieve encryption key');
    });
  });
  
  describe('generateContentFingerprint', () => {
    it('should generate consistent fingerprint for same content', () => {
      const fingerprint1 = encryptionService.generateContentFingerprint(testContent);
      const fingerprint2 = encryptionService.generateContentFingerprint(testContent);
      
      expect(fingerprint1).toBe(fingerprint2);
      expect(fingerprint1).toHaveLength(16);
    });
    
    it('should generate different fingerprints for different content', () => {
      const content1 = Buffer.from('content 1');
      const content2 = Buffer.from('content 2');
      
      const fingerprint1 = encryptionService.generateContentFingerprint(content1);
      const fingerprint2 = encryptionService.generateContentFingerprint(content2);
      
      expect(fingerprint1).not.toBe(fingerprint2);
    });
  });
  
  describe('generateLicenseKey', () => {
    it('should generate consistent license key for same inputs', () => {
      const timestamp = Date.now();
      const key1 = encryptionService.generateLicenseKey(testAssetId, testUserId, timestamp);
      const key2 = encryptionService.generateLicenseKey(testAssetId, testUserId, timestamp);
      
      expect(key1).toBe(key2);
      expect(key1).toMatch(/^[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/);
    });
    
    it('should generate different keys for different inputs', () => {
      const timestamp = Date.now();
      const key1 = encryptionService.generateLicenseKey(testAssetId, testUserId, timestamp);
      const key2 = encryptionService.generateLicenseKey('different-asset', testUserId, timestamp);
      
      expect(key1).not.toBe(key2);
    });
  });
  
  describe('verifyContentIntegrity', () => {
    it('should verify content integrity with correct hash', () => {
      const contentHash = crypto.createHash('sha256').update(testContent).digest('hex');
      const isValid = encryptionService.verifyContentIntegrity(testContent, contentHash);
      
      expect(isValid).toBe(true);
    });
    
    it('should fail verification with incorrect hash', () => {
      const wrongHash = crypto.createHash('sha256').update(Buffer.from('wrong content')).digest('hex');
      const isValid = encryptionService.verifyContentIntegrity(testContent, wrongHash);
      
      expect(isValid).toBe(false);
    });
  });
  
  describe('signContent and verifySignature', () => {
    it('should sign and verify content with RSA keys', () => {
      // Generate RSA key pair for testing
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });
      
      const signature = encryptionService.signContent(testContent, privateKey);
      const isValid = encryptionService.verifySignature(testContent, signature, publicKey);
      
      expect(signature).toBeDefined();
      expect(isValid).toBe(true);
    });
    
    it('should fail verification with wrong public key', () => {
      const { publicKey: publicKey1, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });
      
      const { publicKey: publicKey2 } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });
      
      const signature = encryptionService.signContent(testContent, privateKey);
      const isValid = encryptionService.verifySignature(testContent, signature, publicKey2);
      
      expect(isValid).toBe(false);
    });
  });
  
  describe('generateAccessToken and verifyAccessToken', () => {
    it('should generate and verify access tokens', () => {
      const token = encryptionService.generateAccessToken(testAssetId, testUserId, 60);
      const verified = encryptionService.verifyAccessToken(token);
      
      expect(verified).not.toBeNull();
      expect(verified?.assetId).toBe(testAssetId);
      expect(verified?.userId).toBe(testUserId);
    });
    
    it('should reject expired tokens', () => {
      // Generate token with very short expiration
      const token = encryptionService.generateAccessToken(testAssetId, testUserId, -1);
      const verified = encryptionService.verifyAccessToken(token);
      
      expect(verified).toBeNull();
    });
    
    it('should reject tampered tokens', () => {
      const token = encryptionService.generateAccessToken(testAssetId, testUserId, 60);
      const tamperedToken = token.replace(/.$/, 'X'); // Change last character
      const verified = encryptionService.verifyAccessToken(tamperedToken);
      
      expect(verified).toBeNull();
    });
    
    it('should reject malformed tokens', () => {
      const malformedToken = 'not.a.valid.token';
      const verified = encryptionService.verifyAccessToken(malformedToken);
      
      expect(verified).toBeNull();
    });
  });
  
  describe('error handling', () => {
    it('should handle missing master encryption key', async () => {
      delete process.env.MASTER_ENCRYPTION_KEY;
      
      await expect(encryptionService.encryptKey(testKey))
        .rejects.toThrow('Master encryption key not configured');
    });
    
    it('should handle missing token secret', () => {
      delete process.env.TOKEN_SECRET;
      
      expect(() => encryptionService.generateAccessToken(testAssetId, testUserId))
        .toThrow('Token secret not configured');
    });
    
    it('should handle invalid private key for signing', () => {
      const invalidPrivateKey = 'invalid-private-key';
      
      expect(() => encryptionService.signContent(testContent, invalidPrivateKey))
        .toThrow('Failed to sign content');
    });
    
    it('should handle invalid signature verification gracefully', () => {
      const invalidSignature = 'invalid-signature';
      const { publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });
      
      const isValid = encryptionService.verifySignature(testContent, invalidSignature, publicKey);
      
      expect(isValid).toBe(false);
    });
  });
});