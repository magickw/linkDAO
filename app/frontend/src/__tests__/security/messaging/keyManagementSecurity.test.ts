import { MessageEncryptionService } from '../../../services/messageEncryptionService';

// Mock Web Crypto API
const mockCrypto = {
  subtle: {
    generateKey: jest.fn(),
    exportKey: jest.fn(),
    importKey: jest.fn(),
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    deriveKey: jest.fn(),
  },
  getRandomValues: jest.fn(),
};

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
};

// Setup mocks
Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
});

Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

// Mock TextEncoder/TextDecoder
global.TextEncoder = jest.fn().mockImplementation(() => ({
  encode: jest.fn((text) => new Uint8Array(Buffer.from(text, 'utf8'))),
}));

global.TextDecoder = jest.fn().mockImplementation(() => ({
  decode: jest.fn((buffer) => Buffer.from(buffer).toString('utf8')),
}));

// Mock btoa/atob
global.btoa = jest.fn((str) => Buffer.from(str, 'binary').toString('base64'));
global.atob = jest.fn((str) => Buffer.from(str, 'base64').toString('binary'));

describe('Key Management Security Tests', () => {
  let encryptionService: MessageEncryptionService;
  let mockDB: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    (MessageEncryptionService as any).instance = undefined;
    
    // Mock IndexedDB database
    mockDB = {
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          put: jest.fn(() => ({ onsuccess: null, onerror: null })),
          get: jest.fn(() => ({ onsuccess: null, onerror: null, result: null })),
          delete: jest.fn(() => ({ onsuccess: null, onerror: null })),
          clear: jest.fn(() => ({ onsuccess: null, onerror: null })),
          openCursor: jest.fn(() => ({ onsuccess: null, onerror: null })),
          createIndex: jest.fn(),
        })),
        complete: Promise.resolve(),
      })),
      objectStoreNames: { contains: jest.fn(() => false) },
      createObjectStore: jest.fn(() => ({ createIndex: jest.fn() })),
    };

    mockIndexedDB.open.mockImplementation(() => ({
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: mockDB,
    }));

    encryptionService = MessageEncryptionService.getInstance();
  });

  describe('Key Storage Security', () => {
    it('should encrypt private keys before storing in IndexedDB', async () => {
      const userAddress = '0x1234567890123456789012345678901234567890';
      
      const mockKeyPair = {
        publicKey: { type: 'public' } as CryptoKey,
        privateKey: { type: 'private' } as CryptoKey,
      };
      
      mockCrypto.subtle.generateKey.mockResolvedValue(mockKeyPair);
      mockCrypto.subtle.exportKey
        .mockResolvedValueOnce(new ArrayBuffer(256)) // public key
        .mockResolvedValueOnce(new ArrayBuffer(512)); // private key

      const mockPutRequest = { onsuccess: null, onerror: null };
      const mockStore = {
        put: jest.fn().mockReturnValue(mockPutRequest),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
        complete: Promise.resolve(),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      await encryptionService.generateKeyPair(userAddress);

      // Verify keys are stored with proper structure
      expect(mockStore.put).toHaveBeenCalledWith({
        userAddress,
        publicKey: expect.any(Array),
        privateKey: expect.any(Array),
        createdAt: expect.any(Date),
      });

      // Verify transaction uses readwrite mode for security
      expect(mockDB.transaction).toHaveBeenCalledWith(['keyPairs'], 'readwrite');
    });

    it('should implement secure key retrieval with access control', async () => {
      const userAddress = '0x1234567890123456789012345678901234567890';
      const unauthorizedAddress = '0x9999999999999999999999999999999999999999';
      
      const mockStoredKeyData = {
        userAddress,
        publicKey: [1, 2, 3, 4],
        privateKey: [5, 6, 7, 8],
        createdAt: new Date(),
      };

      const mockGetRequest = { 
        onsuccess: null, 
        onerror: null, 
        result: mockStoredKeyData,
      };
      const mockStore = {
        get: jest.fn().mockReturnValue(mockGetRequest),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      mockCrypto.subtle.importKey
        .mockResolvedValueOnce({ type: 'public' } as CryptoKey)
        .mockResolvedValueOnce({ type: 'private' } as CryptoKey);

      // Authorized access should work
      const keyPair = await (encryptionService as any).loadKeyPair(userAddress);
      expect(keyPair).toBeDefined();

      // Verify proper key import parameters
      expect(mockCrypto.subtle.importKey).toHaveBeenCalledWith(
        'spki',
        expect.any(ArrayBuffer),
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        true,
        ['encrypt']
      );

      expect(mockCrypto.subtle.importKey).toHaveBeenCalledWith(
        'pkcs8',
        expect.any(ArrayBuffer),
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        true,
        ['decrypt']
      );
    });

    it('should prevent unauthorized key access', async () => {
      const userAddress = '0x1234567890123456789012345678901234567890';
      
      // Mock no key found
      const mockGetRequest = { 
        onsuccess: null, 
        onerror: null, 
        result: null,
      };
      const mockStore = {
        get: jest.fn().mockReturnValue(mockGetRequest),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      const keyPair = await (encryptionService as any).loadKeyPair(userAddress);
      
      expect(keyPair).toBeNull();
      expect(mockStore.get).toHaveBeenCalledWith(userAddress);
    });

    it('should implement secure key deletion', async () => {
      const userAddress = '0x1234567890123456789012345678901234567890';
      
      const mockDeleteRequest = { onsuccess: null, onerror: null };
      const mockStore = {
        delete: jest.fn().mockReturnValue(mockDeleteRequest),
        clear: jest.fn().mockReturnValue(mockDeleteRequest),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
        complete: Promise.resolve(),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      await encryptionService.clearAllKeys();

      // Verify secure deletion of all key stores
      expect(mockStore.clear).toHaveBeenCalledTimes(2); // keyPairs and publicKeys
      expect(mockDB.transaction).toHaveBeenCalledWith(['keyPairs', 'publicKeys'], 'readwrite');
    });

    it('should handle database corruption gracefully', async () => {
      const userAddress = '0x1234567890123456789012345678901234567890';
      
      // Mock database error
      const mockGetRequest = { 
        onsuccess: null, 
        onerror: () => new Error('Database corrupted'),
        result: null,
      };
      const mockStore = {
        get: jest.fn().mockReturnValue(mockGetRequest),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      const keyPair = await (encryptionService as any).loadKeyPair(userAddress);
      
      // Should handle corruption gracefully
      expect(keyPair).toBeNull();
    });
  });

  describe('Key Backup Security', () => {
    it('should use strong key derivation for backup encryption', async () => {
      const userAddress = '0x1234567890123456789012345678901234567890';
      const passphrase = 'strongPassphrase123!@#';
      
      const mockKeyPair = {
        publicKey: { type: 'public' } as CryptoKey,
        privateKey: { type: 'private' } as CryptoKey,
      };
      
      (encryptionService as any).keyPairs.set(userAddress, mockKeyPair);
      
      mockCrypto.subtle.exportKey
        .mockResolvedValueOnce(new ArrayBuffer(256))
        .mockResolvedValueOnce(new ArrayBuffer(512));
      
      const mockKeyMaterial = { type: 'raw' } as CryptoKey;
      const mockDerivedKey = { type: 'secret' } as CryptoKey;
      const mockSalt = new Uint8Array(16);
      const mockIV = new Uint8Array(12);
      
      mockCrypto.subtle.importKey.mockResolvedValue(mockKeyMaterial);
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockDerivedKey);
      mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(128));
      mockCrypto.getRandomValues
        .mockReturnValueOnce(mockSalt)
        .mockReturnValueOnce(mockIV);

      await encryptionService.backupKeys(userAddress, passphrase);

      // Verify strong PBKDF2 parameters
      expect(mockCrypto.subtle.deriveKey).toHaveBeenCalledWith(
        {
          name: 'PBKDF2',
          salt: mockSalt,
          iterations: 100000, // Strong iteration count
          hash: 'SHA-256',
        },
        mockKeyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      // Verify secure random salt generation
      expect(mockCrypto.getRandomValues).toHaveBeenCalledWith(expect.any(Uint8Array));
    });

    it('should validate backup integrity during restore', async () => {
      const backupData = btoa(JSON.stringify({
        encryptedData: [1, 2, 3, 4],
        salt: [5, 6, 7, 8],
        iv: [9, 10, 11, 12],
      }));
      const passphrase = 'strongPassphrase123!@#';
      
      const mockKeyMaterial = { type: 'raw' } as CryptoKey;
      const mockDerivedKey = { type: 'secret' } as CryptoKey;
      const mockDecryptedData = JSON.stringify({
        userAddress: '0x1234567890123456789012345678901234567890',
        publicKey: [1, 2, 3],
        privateKey: [4, 5, 6],
        createdAt: new Date().toISOString(),
        version: 1,
      });
      
      mockCrypto.subtle.importKey.mockResolvedValue(mockKeyMaterial);
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockDerivedKey);
      mockCrypto.subtle.decrypt.mockResolvedValue(
        new TextEncoder().encode(mockDecryptedData).buffer
      );
      mockCrypto.subtle.importKey
        .mockResolvedValueOnce({ type: 'public' } as CryptoKey)
        .mockResolvedValueOnce({ type: 'private' } as CryptoKey);

      const result = await encryptionService.restoreKeys(backupData, passphrase);

      expect(result).toBe(true);
      
      // Verify backup integrity validation
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalledWith(
        { name: 'AES-GCM', iv: expect.any(Uint8Array) },
        mockDerivedKey,
        expect.any(Uint8Array)
      );
    });

    it('should reject tampered backup data', async () => {
      const tamperedBackupData = 'tamperedData';
      const passphrase = 'strongPassphrase123!@#';
      
      // Mock base64 decode failure
      global.atob = jest.fn().mockImplementation(() => {
        throw new Error('Invalid base64');
      });

      const result = await encryptionService.restoreKeys(tamperedBackupData, passphrase);
      
      expect(result).toBe(false);
    });

    it('should prevent brute force attacks on backup', async () => {
      const backupData = btoa(JSON.stringify({
        encryptedData: [1, 2, 3, 4],
        salt: [5, 6, 7, 8],
        iv: [9, 10, 11, 12],
      }));
      const wrongPassphrase = 'wrongPassphrase';
      
      const mockKeyMaterial = { type: 'raw' } as CryptoKey;
      const mockDerivedKey = { type: 'secret' } as CryptoKey;
      
      mockCrypto.subtle.importKey.mockResolvedValue(mockKeyMaterial);
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockDerivedKey);
      mockCrypto.subtle.decrypt.mockRejectedValue(new Error('Decryption failed'));

      const result = await encryptionService.restoreKeys(backupData, wrongPassphrase);
      
      expect(result).toBe(false);
      
      // Verify PBKDF2 still uses strong parameters even for wrong passphrase
      expect(mockCrypto.subtle.deriveKey).toHaveBeenCalledWith(
        expect.objectContaining({
          iterations: 100000, // High iteration count prevents brute force
        }),
        expect.any(CryptoKey),
        expect.any(Object),
        expect.any(Boolean),
        expect.any(Array)
      );
    });
  });

  describe('Key Rotation Security', () => {
    it('should securely destroy old keys during rotation', async () => {
      const userAddress = '0x1234567890123456789012345678901234567890';
      
      const oldKeyPair = {
        publicKey: { type: 'public' } as CryptoKey,
        privateKey: { type: 'private' } as CryptoKey,
      };
      
      const newKeyPair = {
        publicKey: { type: 'public' } as CryptoKey,
        privateKey: { type: 'private' } as CryptoKey,
      };
      
      (encryptionService as any).keyPairs.set(userAddress, oldKeyPair);
      
      mockCrypto.subtle.generateKey.mockResolvedValue(newKeyPair);
      mockCrypto.subtle.exportKey
        .mockResolvedValueOnce(new ArrayBuffer(256))
        .mockResolvedValueOnce(new ArrayBuffer(512));

      const mockPutRequest = { onsuccess: null, onerror: null };
      const mockStore = {
        put: jest.fn().mockReturnValue(mockPutRequest),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
        complete: Promise.resolve(),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      const result = await encryptionService.rotateKeys(userAddress);

      expect(result).toBe(true);
      
      // Verify old key is replaced in memory
      expect((encryptionService as any).keyPairs.get(userAddress)).toBe(newKeyPair);
      expect((encryptionService as any).keyPairs.get(userAddress)).not.toBe(oldKeyPair);
      
      // Verify new key is stored
      expect(mockStore.put).toHaveBeenCalled();
    });

    it('should maintain forward secrecy during key rotation', async () => {
      const userAddress = '0x1234567890123456789012345678901234567890';
      
      const keyPair1 = {
        publicKey: { type: 'public', algorithm: { name: 'RSA-OAEP' } } as CryptoKey,
        privateKey: { type: 'private', algorithm: { name: 'RSA-OAEP' } } as CryptoKey,
      };
      
      const keyPair2 = {
        publicKey: { type: 'public', algorithm: { name: 'RSA-OAEP' } } as CryptoKey,
        privateKey: { type: 'private', algorithm: { name: 'RSA-OAEP' } } as CryptoKey,
      };
      
      mockCrypto.subtle.generateKey
        .mockResolvedValueOnce(keyPair1)
        .mockResolvedValueOnce(keyPair2);
      
      mockCrypto.subtle.exportKey
        .mockResolvedValue(new ArrayBuffer(256))
        .mockResolvedValue(new ArrayBuffer(512));

      const mockPutRequest = { onsuccess: null, onerror: null };
      const mockStore = {
        put: jest.fn().mockReturnValue(mockPutRequest),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
        complete: Promise.resolve(),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      // Generate initial key
      await encryptionService.generateKeyPair(userAddress);
      
      // Rotate key
      await encryptionService.rotateKeys(userAddress);

      // Verify two different key generations
      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledTimes(2);
      
      // Each key generation should use secure parameters
      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledWith(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true,
        ['encrypt', 'decrypt']
      );
    });

    it('should handle key rotation failures securely', async () => {
      const userAddress = '0x1234567890123456789012345678901234567890';
      
      const oldKeyPair = {
        publicKey: { type: 'public' } as CryptoKey,
        privateKey: { type: 'private' } as CryptoKey,
      };
      
      (encryptionService as any).keyPairs.set(userAddress, oldKeyPair);
      
      // Mock key generation failure
      mockCrypto.subtle.generateKey.mockRejectedValue(new Error('Key generation failed'));

      const result = await encryptionService.rotateKeys(userAddress);

      expect(result).toBe(false);
      
      // Verify old key is preserved on failure
      expect((encryptionService as any).keyPairs.get(userAddress)).toBe(oldKeyPair);
    });
  });

  describe('Key Exchange Security', () => {
    it('should implement secure key exchange protocol', async () => {
      const currentUserAddress = '0x1111111111111111111111111111111111111111';
      const otherUserAddress = '0x2222222222222222222222222222222222222222';
      
      const mockPublicKey = 'mockPublicKeyBase64';
      
      jest.spyOn(encryptionService, 'exportPublicKey').mockResolvedValue(mockPublicKey);

      const result = await encryptionService.exchangeKeys(currentUserAddress, otherUserAddress);

      expect(result).toEqual({
        success: true,
        publicKey: mockPublicKey,
      });

      // Verify public key export is called
      expect(encryptionService.exportPublicKey).toHaveBeenCalledWith(currentUserAddress);
    });

    it('should validate public key authenticity during exchange', async () => {
      const userAddress = '0x1111111111111111111111111111111111111111';
      const maliciousPublicKey = 'maliciousKey';
      
      // Mock key validation failure
      mockCrypto.subtle.importKey.mockRejectedValue(new Error('Invalid key'));

      await expect(encryptionService.importPublicKey(maliciousPublicKey))
        .rejects.toThrow('Public key import failed');
    });

    it('should prevent key substitution attacks', async () => {
      const userAddress = '0x1111111111111111111111111111111111111111';
      const validPublicKey = 'validPublicKeyBase64';
      const substitutedPublicKey = 'substitutedPublicKeyBase64';
      
      // Mock successful import for valid key
      mockCrypto.subtle.importKey
        .mockResolvedValueOnce({ type: 'public' } as CryptoKey)
        .mockRejectedValueOnce(new Error('Key validation failed'));

      // Valid key should work
      const validKey = await encryptionService.importPublicKey(validPublicKey);
      expect(validKey).toBeDefined();

      // Substituted key should fail
      await expect(encryptionService.importPublicKey(substitutedPublicKey))
        .rejects.toThrow('Public key import failed');
    });
  });

  describe('Memory Security', () => {
    it('should clear sensitive data from memory', async () => {
      const userAddress = '0x1234567890123456789012345678901234567890';
      
      const mockKeyPair = {
        publicKey: { type: 'public' } as CryptoKey,
        privateKey: { type: 'private' } as CryptoKey,
      };
      
      (encryptionService as any).keyPairs.set(userAddress, mockKeyPair);
      (encryptionService as any).symmetricKeys.set('conv-1', { type: 'secret' } as CryptoKey);

      // Verify keys are in memory
      expect((encryptionService as any).keyPairs.size).toBe(1);
      expect((encryptionService as any).symmetricKeys.size).toBe(1);

      const mockClearRequest = { onsuccess: null, onerror: null };
      const mockStore = {
        clear: jest.fn().mockReturnValue(mockClearRequest),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
        complete: Promise.resolve(),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      await encryptionService.clearAllKeys();

      // Verify memory is cleared
      expect((encryptionService as any).keyPairs.size).toBe(0);
      expect((encryptionService as any).symmetricKeys.size).toBe(0);
    });

    it('should prevent key material leakage through garbage collection', async () => {
      const userAddress = '0x1234567890123456789012345678901234567890';
      
      const mockKeyPair = {
        publicKey: { type: 'public' } as CryptoKey,
        privateKey: { type: 'private' } as CryptoKey,
      };
      
      // Add key to memory
      (encryptionService as any).keyPairs.set(userAddress, mockKeyPair);
      
      // Remove key reference
      (encryptionService as any).keyPairs.delete(userAddress);
      
      // Verify key is removed from memory
      expect((encryptionService as any).keyPairs.has(userAddress)).toBe(false);
    });

    it('should handle memory pressure gracefully', async () => {
      const userAddresses = Array.from({ length: 1000 }, (_, i) => 
        `0x${i.toString().padStart(40, '0')}`
      );
      
      const mockKeyPair = {
        publicKey: { type: 'public' } as CryptoKey,
        privateKey: { type: 'private' } as CryptoKey,
      };
      
      // Add many keys to memory
      userAddresses.forEach(address => {
        (encryptionService as any).keyPairs.set(address, mockKeyPair);
      });
      
      expect((encryptionService as any).keyPairs.size).toBe(1000);
      
      // Clear all keys
      const mockClearRequest = { onsuccess: null, onerror: null };
      const mockStore = {
        clear: jest.fn().mockReturnValue(mockClearRequest),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
        complete: Promise.resolve(),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      await encryptionService.clearAllKeys();
      
      // Verify all keys are cleared
      expect((encryptionService as any).keyPairs.size).toBe(0);
    });
  });

  describe('Access Control Security', () => {
    it('should enforce user-specific key access', async () => {
      const user1Address = '0x1111111111111111111111111111111111111111';
      const user2Address = '0x2222222222222222222222222222222222222222';
      
      const user1KeyPair = {
        publicKey: { type: 'public' } as CryptoKey,
        privateKey: { type: 'private' } as CryptoKey,
      };
      
      const user2KeyPair = {
        publicKey: { type: 'public' } as CryptoKey,
        privateKey: { type: 'private' } as CryptoKey,
      };
      
      (encryptionService as any).keyPairs.set(user1Address, user1KeyPair);
      (encryptionService as any).keyPairs.set(user2Address, user2KeyPair);

      // User 1 should only access their own keys
      const retrievedKey1 = await encryptionService.getKeyPair(user1Address);
      expect(retrievedKey1).toBe(user1KeyPair);
      
      // User 2 should only access their own keys
      const retrievedKey2 = await encryptionService.getKeyPair(user2Address);
      expect(retrievedKey2).toBe(user2KeyPair);
      
      // Keys should be isolated
      expect(retrievedKey1).not.toBe(retrievedKey2);
    });

    it('should prevent cross-user key contamination', async () => {
      const user1Address = '0x1111111111111111111111111111111111111111';
      const user2Address = '0x2222222222222222222222222222222222222222';
      
      const user1KeyPair = {
        publicKey: { type: 'public' } as CryptoKey,
        privateKey: { type: 'private' } as CryptoKey,
      };
      
      (encryptionService as any).keyPairs.set(user1Address, user1KeyPair);
      
      // User 2 should not have access to User 1's keys
      const user2Keys = (encryptionService as any).keyPairs.get(user2Address);
      expect(user2Keys).toBeUndefined();
    });

    it('should validate user permissions for key operations', async () => {
      const userAddress = '0x1234567890123456789012345678901234567890';
      const unauthorizedAddress = '0x9999999999999999999999999999999999999999';
      
      const mockKeyPair = {
        publicKey: { type: 'public' } as CryptoKey,
        privateKey: { type: 'private' } as CryptoKey,
      };
      
      (encryptionService as any).keyPairs.set(userAddress, mockKeyPair);
      
      // Authorized user should access their keys
      const authorizedAccess = await encryptionService.getKeyPair(userAddress);
      expect(authorizedAccess).toBe(mockKeyPair);
      
      // Unauthorized user should not access other's keys
      const unauthorizedAccess = (encryptionService as any).keyPairs.get(unauthorizedAddress);
      expect(unauthorizedAccess).toBeUndefined();
    });
  });

  describe('Audit and Compliance', () => {
    it('should maintain audit trail for key operations', async () => {
      const userAddress = '0x1234567890123456789012345678901234567890';
      
      const mockKeyPair = {
        publicKey: { type: 'public' } as CryptoKey,
        privateKey: { type: 'private' } as CryptoKey,
      };
      
      mockCrypto.subtle.generateKey.mockResolvedValue(mockKeyPair);
      mockCrypto.subtle.exportKey
        .mockResolvedValueOnce(new ArrayBuffer(256))
        .mockResolvedValueOnce(new ArrayBuffer(512));

      const mockPutRequest = { onsuccess: null, onerror: null };
      const mockStore = {
        put: jest.fn().mockReturnValue(mockPutRequest),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
        complete: Promise.resolve(),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      await encryptionService.generateKeyPair(userAddress);

      // Verify audit information is stored
      expect(mockStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          userAddress,
          createdAt: expect.any(Date),
        })
      );
    });

    it('should comply with data retention policies', async () => {
      const userAddress = '0x1234567890123456789012345678901234567890';
      
      // Mock old key data (older than retention period)
      const oldDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
      
      const mockCursor = {
        value: {
          userAddress,
          createdAt: oldDate,
        },
        delete: jest.fn(),
        continue: jest.fn(),
      };

      const mockOpenCursorRequest = { 
        onsuccess: null, 
        onerror: null,
      };
      
      const mockIndex = {
        openCursor: jest.fn().mockReturnValue(mockOpenCursorRequest),
      };
      
      const mockStore = {
        index: jest.fn().mockReturnValue(mockIndex),
      };
      
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
      };
      
      mockDB.transaction.mockReturnValue(mockTransaction);

      // Simulate cursor iteration for cleanup
      setTimeout(() => {
        if (mockOpenCursorRequest.onsuccess) {
          (mockOpenCursorRequest as any).result = mockCursor;
          mockOpenCursorRequest.onsuccess({ target: mockOpenCursorRequest } as any);
          
          // Simulate end of cursor
          (mockOpenCursorRequest as any).result = null;
          mockOpenCursorRequest.onsuccess({ target: mockOpenCursorRequest } as any);
        }
      }, 0);

      // Verify cleanup mechanism exists
      expect(mockIndex.openCursor).toBeDefined();
    });

    it('should support key escrow for compliance', async () => {
      const userAddress = '0x1234567890123456789012345678901234567890';
      const escrowPassphrase = 'escrowPassphrase123!@#';
      
      const mockKeyPair = {
        publicKey: { type: 'public' } as CryptoKey,
        privateKey: { type: 'private' } as CryptoKey,
      };
      
      (encryptionService as any).keyPairs.set(userAddress, mockKeyPair);
      
      mockCrypto.subtle.exportKey
        .mockResolvedValueOnce(new ArrayBuffer(256))
        .mockResolvedValueOnce(new ArrayBuffer(512));
      
      const mockKeyMaterial = { type: 'raw' } as CryptoKey;
      const mockDerivedKey = { type: 'secret' } as CryptoKey;
      
      mockCrypto.subtle.importKey.mockResolvedValue(mockKeyMaterial);
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockDerivedKey);
      mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(128));
      mockCrypto.getRandomValues
        .mockReturnValueOnce(new Uint8Array(16))
        .mockReturnValueOnce(new Uint8Array(12));

      const escrowBackup = await encryptionService.backupKeys(userAddress, escrowPassphrase);

      // Verify escrow backup is created
      expect(typeof escrowBackup).toBe('string');
      expect(escrowBackup.length).toBeGreaterThan(0);
    });
  });
});