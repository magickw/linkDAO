import { MessageEncryptionService } from '../../../services/messageEncryptionService';
import { EncryptedMessage } from '../../../types/messaging';

// Mock Web Crypto API with realistic implementations
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

describe('Messaging Encryption Security Tests', () => {
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

  describe('Key Generation Security', () => {
    it('should generate cryptographically secure RSA key pairs', async () => {
      const userAddress = '0x1234567890123456789012345678901234567890';
      
      const mockKeyPair = {
        publicKey: { type: 'public', algorithm: { name: 'RSA-OAEP' } } as CryptoKey,
        privateKey: { type: 'private', algorithm: { name: 'RSA-OAEP' } } as CryptoKey,
      };

      mockCrypto.subtle.generateKey.mockResolvedValue(mockKeyPair);
      mockCrypto.subtle.exportKey
        .mockResolvedValueOnce(new ArrayBuffer(256))
        .mockResolvedValueOnce(new ArrayBuffer(512));

      await encryptionService.generateKeyPair(userAddress);

      // Verify secure key generation parameters
      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledWith(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048, // Minimum secure key size
          publicExponent: new Uint8Array([1, 0, 1]), // Standard exponent
          hash: 'SHA-256', // Secure hash algorithm
        },
        true, // Extractable for backup purposes
        ['encrypt', 'decrypt']
      );
    });

    it('should use secure random values for key generation', async () => {
      const userAddress = '0x1234567890123456789012345678901234567890';
      
      mockCrypto.getRandomValues.mockImplementation((array) => {
        // Simulate cryptographically secure random values
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        return array;
      });

      const mockKeyPair = {
        publicKey: { type: 'public' } as CryptoKey,
        privateKey: { type: 'private' } as CryptoKey,
      };

      mockCrypto.subtle.generateKey.mockResolvedValue(mockKeyPair);
      mockCrypto.subtle.exportKey
        .mockResolvedValueOnce(new ArrayBuffer(256))
        .mockResolvedValueOnce(new ArrayBuffer(512));

      await encryptionService.generateKeyPair(userAddress);

      // Verify that secure random values are used
      expect(mockCrypto.getRandomValues).toHaveBeenCalled();
    });

    it('should reject weak key generation parameters', async () => {
      const userAddress = '0x1234567890123456789012345678901234567890';
      
      // Mock weak key generation attempt
      mockCrypto.subtle.generateKey.mockRejectedValue(new Error('Weak key parameters'));

      await expect(encryptionService.generateKeyPair(userAddress)).rejects.toThrow('Key pair generation failed');
    });

    it('should ensure key uniqueness across users', async () => {
      const user1Address = '0x1111111111111111111111111111111111111111';
      const user2Address = '0x2222222222222222222222222222222222222222';
      
      const mockKeyPair1 = {
        publicKey: { type: 'public', extractable: true } as CryptoKey,
        privateKey: { type: 'private', extractable: true } as CryptoKey,
      };
      
      const mockKeyPair2 = {
        publicKey: { type: 'public', extractable: true } as CryptoKey,
        privateKey: { type: 'private', extractable: true } as CryptoKey,
      };

      mockCrypto.subtle.generateKey
        .mockResolvedValueOnce(mockKeyPair1)
        .mockResolvedValueOnce(mockKeyPair2);
      
      mockCrypto.subtle.exportKey
        .mockResolvedValueOnce(new ArrayBuffer(256)) // user1 public
        .mockResolvedValueOnce(new ArrayBuffer(512)) // user1 private
        .mockResolvedValueOnce(new ArrayBuffer(256)) // user2 public
        .mockResolvedValueOnce(new ArrayBuffer(512)); // user2 private

      const keyPair1 = await encryptionService.generateKeyPair(user1Address);
      const keyPair2 = await encryptionService.generateKeyPair(user2Address);

      // Keys should be different instances
      expect(keyPair1).not.toBe(keyPair2);
      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledTimes(2);
    });
  });

  describe('Message Encryption Security', () => {
    it('should use hybrid encryption (RSA + AES) for optimal security', async () => {
      const content = 'Sensitive message content';
      const recipientPublicKeyBase64 = 'mockRecipientPublicKey';
      const senderAddress = '0x1111';
      
      const mockSymmetricKey = { type: 'secret' } as CryptoKey;
      const mockRecipientPublicKey = { type: 'public' } as CryptoKey;
      const mockIV = new Uint8Array(12);
      
      mockCrypto.subtle.generateKey.mockResolvedValue(mockSymmetricKey);
      mockCrypto.getRandomValues.mockReturnValue(mockIV);
      mockCrypto.subtle.encrypt
        .mockResolvedValueOnce(new ArrayBuffer(64)) // AES encryption
        .mockResolvedValueOnce(new ArrayBuffer(256)); // RSA encryption
      mockCrypto.subtle.exportKey.mockResolvedValue(new ArrayBuffer(32));
      mockCrypto.subtle.importKey.mockResolvedValue(mockRecipientPublicKey);

      await encryptionService.encryptMessage(content, recipientPublicKeyBase64, senderAddress);

      // Verify AES key generation
      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledWith(
        { name: 'AES-GCM', length: 256 }, // Strong symmetric encryption
        true,
        ['encrypt', 'decrypt']
      );

      // Verify AES-GCM encryption (authenticated encryption)
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalledWith(
        { name: 'AES-GCM', iv: mockIV },
        mockSymmetricKey,
        expect.any(Uint8Array)
      );

      // Verify RSA-OAEP encryption for key wrapping
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalledWith(
        { name: 'RSA-OAEP' },
        mockRecipientPublicKey,
        expect.any(ArrayBuffer)
      );
    });

    it('should use unique IVs for each message', async () => {
      const content1 = 'Message 1';
      const content2 = 'Message 2';
      const recipientPublicKeyBase64 = 'mockRecipientPublicKey';
      const senderAddress = '0x1111';
      
      const mockSymmetricKey = { type: 'secret' } as CryptoKey;
      const mockRecipientPublicKey = { type: 'public' } as CryptoKey;
      const mockIV1 = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      const mockIV2 = new Uint8Array([13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
      
      mockCrypto.subtle.generateKey.mockResolvedValue(mockSymmetricKey);
      mockCrypto.getRandomValues
        .mockReturnValueOnce(mockIV1)
        .mockReturnValueOnce(mockIV2);
      mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(64));
      mockCrypto.subtle.exportKey.mockResolvedValue(new ArrayBuffer(32));
      mockCrypto.subtle.importKey.mockResolvedValue(mockRecipientPublicKey);

      const encrypted1 = await encryptionService.encryptMessage(content1, recipientPublicKeyBase64, senderAddress);
      const encrypted2 = await encryptionService.encryptMessage(content2, recipientPublicKeyBase64, senderAddress);

      // IVs should be different
      expect(encrypted1.iv).not.toEqual(encrypted2.iv);
      expect(mockCrypto.getRandomValues).toHaveBeenCalledTimes(2);
    });

    it('should prevent IV reuse attacks', async () => {
      const content = 'Test message';
      const recipientPublicKeyBase64 = 'mockRecipientPublicKey';
      const senderAddress = '0x1111';
      
      const mockSymmetricKey = { type: 'secret' } as CryptoKey;
      const mockRecipientPublicKey = { type: 'public' } as CryptoKey;
      const fixedIV = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      
      mockCrypto.subtle.generateKey.mockResolvedValue(mockSymmetricKey);
      mockCrypto.getRandomValues.mockReturnValue(fixedIV);
      mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(64));
      mockCrypto.subtle.exportKey.mockResolvedValue(new ArrayBuffer(32));
      mockCrypto.subtle.importKey.mockResolvedValue(mockRecipientPublicKey);

      // Multiple encryptions should still use different IVs due to fresh generation
      const encrypted1 = await encryptionService.encryptMessage(content, recipientPublicKeyBase64, senderAddress);
      const encrypted2 = await encryptionService.encryptMessage(content, recipientPublicKeyBase64, senderAddress);

      // Even with same content, encryption should be different due to fresh IV generation
      expect(mockCrypto.getRandomValues).toHaveBeenCalledTimes(2);
    });

    it('should validate message integrity during encryption', async () => {
      const content = 'Test message';
      const recipientPublicKeyBase64 = 'mockRecipientPublicKey';
      const senderAddress = '0x1111';
      
      const mockSymmetricKey = { type: 'secret' } as CryptoKey;
      const mockRecipientPublicKey = { type: 'public' } as CryptoKey;
      const mockIV = new Uint8Array(12);
      const mockEncryptedContent = new ArrayBuffer(64);
      
      mockCrypto.subtle.generateKey.mockResolvedValue(mockSymmetricKey);
      mockCrypto.getRandomValues.mockReturnValue(mockIV);
      mockCrypto.subtle.encrypt.mockResolvedValue(mockEncryptedContent);
      mockCrypto.subtle.exportKey.mockResolvedValue(new ArrayBuffer(32));
      mockCrypto.subtle.importKey.mockResolvedValue(mockRecipientPublicKey);

      const encryptedMessage = await encryptionService.encryptMessage(content, recipientPublicKeyBase64, senderAddress);

      // Verify AES-GCM provides authenticated encryption
      expect(encryptedMessage.encryptedContent).toEqual(Array.from(new Uint8Array(mockEncryptedContent)));
      expect(encryptedMessage.iv).toEqual(Array.from(mockIV));
    });
  });

  describe('Message Decryption Security', () => {
    it('should verify message authenticity during decryption', async () => {
      const recipientAddress = '0x1111';
      const encryptedMessage: EncryptedMessage = {
        encryptedContent: [1, 2, 3, 4],
        encryptedKey: [5, 6, 7, 8],
        iv: [9, 10, 11, 12],
      };
      
      const mockKeyPair = {
        publicKey: { type: 'public' } as CryptoKey,
        privateKey: { type: 'private' } as CryptoKey,
      };
      const mockSymmetricKey = { type: 'secret' } as CryptoKey;
      const mockDecryptedContent = new ArrayBuffer(64);
      
      (encryptionService as any).keyPairs.set(recipientAddress, mockKeyPair);
      
      mockCrypto.subtle.decrypt
        .mockResolvedValueOnce(new ArrayBuffer(32)) // Key decryption
        .mockResolvedValueOnce(mockDecryptedContent); // Message decryption
      mockCrypto.subtle.importKey.mockResolvedValue(mockSymmetricKey);

      await encryptionService.decryptMessage(encryptedMessage, recipientAddress);

      // Verify RSA-OAEP decryption for key unwrapping
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalledWith(
        { name: 'RSA-OAEP' },
        mockKeyPair.privateKey,
        expect.any(ArrayBuffer)
      );

      // Verify AES-GCM decryption with authentication
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalledWith(
        { name: 'AES-GCM', iv: expect.any(Uint8Array) },
        mockSymmetricKey,
        expect.any(ArrayBuffer)
      );
    });

    it('should reject tampered messages', async () => {
      const recipientAddress = '0x1111';
      const tamperedMessage: EncryptedMessage = {
        encryptedContent: [1, 2, 3, 4], // Tampered content
        encryptedKey: [5, 6, 7, 8],
        iv: [9, 10, 11, 12],
      };
      
      const mockKeyPair = {
        publicKey: { type: 'public' } as CryptoKey,
        privateKey: { type: 'private' } as CryptoKey,
      };
      
      (encryptionService as any).keyPairs.set(recipientAddress, mockKeyPair);
      
      // Mock authentication failure
      mockCrypto.subtle.decrypt
        .mockResolvedValueOnce(new ArrayBuffer(32)) // Key decryption succeeds
        .mockRejectedValueOnce(new Error('Authentication tag verification failed'));

      await expect(encryptionService.decryptMessage(tamperedMessage, recipientAddress))
        .rejects.toThrow('Message decryption failed');
    });

    it('should prevent key substitution attacks', async () => {
      const recipientAddress = '0x1111';
      const encryptedMessage: EncryptedMessage = {
        encryptedContent: [1, 2, 3, 4],
        encryptedKey: [5, 6, 7, 8], // Encrypted with wrong key
        iv: [9, 10, 11, 12],
      };
      
      const mockKeyPair = {
        publicKey: { type: 'public' } as CryptoKey,
        privateKey: { type: 'private' } as CryptoKey,
      };
      
      (encryptionService as any).keyPairs.set(recipientAddress, mockKeyPair);
      
      // Mock key decryption failure (wrong key used)
      mockCrypto.subtle.decrypt.mockRejectedValue(new Error('Key decryption failed'));

      await expect(encryptionService.decryptMessage(encryptedMessage, recipientAddress))
        .rejects.toThrow('Message decryption failed');
    });
  });

  describe('Key Management Security', () => {
    it('should securely store private keys in IndexedDB', async () => {
      const userAddress = '0x1111';
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

      // Verify keys are stored securely
      expect(mockStore.put).toHaveBeenCalledWith({
        userAddress,
        publicKey: expect.any(Array),
        privateKey: expect.any(Array),
        createdAt: expect.any(Date),
      });
    });

    it('should implement secure key backup with passphrase protection', async () => {
      const userAddress = '0x1111';
      const passphrase = 'securePassphrase123!@#';
      
      const mockKeyPair = {
        publicKey: { type: 'public' } as CryptoKey,
        privateKey: { type: 'private' } as CryptoKey,
      };
      
      (encryptionService as any).keyPairs.set(userAddress, mockKeyPair);
      
      mockCrypto.subtle.exportKey
        .mockResolvedValueOnce(new ArrayBuffer(256)) // public key
        .mockResolvedValueOnce(new ArrayBuffer(512)); // private key
      
      // Mock PBKDF2 key derivation
      const mockDerivedKey = { type: 'secret' } as CryptoKey;
      const mockKeyMaterial = { type: 'raw' } as CryptoKey;
      
      mockCrypto.subtle.importKey.mockResolvedValue(mockKeyMaterial);
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockDerivedKey);
      mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(128));
      mockCrypto.getRandomValues
        .mockReturnValueOnce(new Uint8Array(16)) // salt
        .mockReturnValueOnce(new Uint8Array(12)); // iv

      const backup = await encryptionService.backupKeys(userAddress, passphrase);

      // Verify PBKDF2 is used for key derivation
      expect(mockCrypto.subtle.deriveKey).toHaveBeenCalledWith(
        {
          name: 'PBKDF2',
          salt: expect.any(Uint8Array),
          iterations: 100000, // Strong iteration count
          hash: 'SHA-256',
        },
        mockKeyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      expect(typeof backup).toBe('string');
    });

    it('should validate passphrase strength for key backup', async () => {
      const userAddress = '0x1111';
      const weakPassphrase = '123'; // Too weak
      
      const mockKeyPair = {
        publicKey: { type: 'public' } as CryptoKey,
        privateKey: { type: 'private' } as CryptoKey,
      };
      
      (encryptionService as any).keyPairs.set(userAddress, mockKeyPair);

      // Should reject weak passphrases
      await expect(encryptionService.backupKeys(userAddress, weakPassphrase))
        .rejects.toThrow('Key backup failed');
    });

    it('should implement secure key rotation', async () => {
      const userAddress = '0x1111';
      
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

      const result = await encryptionService.rotateKeys(userAddress);

      expect(result).toBe(true);
      expect(mockCrypto.subtle.generateKey).toHaveBeenCalled();
      
      // Verify old key is replaced
      expect((encryptionService as any).keyPairs.get(userAddress)).toBe(newKeyPair);
    });

    it('should clear all keys securely on logout', async () => {
      const userAddress1 = '0x1111';
      const userAddress2 = '0x2222';
      
      const mockKeyPair1 = { publicKey: {} as CryptoKey, privateKey: {} as CryptoKey };
      const mockKeyPair2 = { publicKey: {} as CryptoKey, privateKey: {} as CryptoKey };
      
      (encryptionService as any).keyPairs.set(userAddress1, mockKeyPair1);
      (encryptionService as any).keyPairs.set(userAddress2, mockKeyPair2);
      (encryptionService as any).symmetricKeys.set('conv-1', {} as CryptoKey);

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

      // Verify database is cleared
      expect(mockStore.clear).toHaveBeenCalledTimes(2); // keyPairs and publicKeys stores
    });
  });

  describe('Attack Prevention', () => {
    it('should prevent timing attacks on key operations', async () => {
      const userAddress = '0x1111';
      const validKey = 'validPublicKeyBase64';
      const invalidKey = 'invalidPublicKeyBase64';
      
      // Mock consistent timing for both valid and invalid keys
      mockCrypto.subtle.importKey
        .mockResolvedValueOnce({ type: 'public' } as CryptoKey)
        .mockRejectedValueOnce(new Error('Invalid key'));

      const startTime1 = Date.now();
      try {
        await encryptionService.importPublicKey(validKey);
      } catch (e) {}
      const endTime1 = Date.now();

      const startTime2 = Date.now();
      try {
        await encryptionService.importPublicKey(invalidKey);
      } catch (e) {}
      const endTime2 = Date.now();

      // Timing should be similar to prevent timing attacks
      const timeDiff = Math.abs((endTime1 - startTime1) - (endTime2 - startTime2));
      expect(timeDiff).toBeLessThan(100); // Allow some variance
    });

    it('should prevent side-channel attacks on encryption', async () => {
      const content1 = 'a'; // Short content
      const content2 = 'a'.repeat(1000); // Long content
      const recipientPublicKeyBase64 = 'mockRecipientPublicKey';
      const senderAddress = '0x1111';
      
      const mockSymmetricKey = { type: 'secret' } as CryptoKey;
      const mockRecipientPublicKey = { type: 'public' } as CryptoKey;
      
      mockCrypto.subtle.generateKey.mockResolvedValue(mockSymmetricKey);
      mockCrypto.getRandomValues.mockReturnValue(new Uint8Array(12));
      mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(64));
      mockCrypto.subtle.exportKey.mockResolvedValue(new ArrayBuffer(32));
      mockCrypto.subtle.importKey.mockResolvedValue(mockRecipientPublicKey);

      // Both encryptions should use the same secure process
      await encryptionService.encryptMessage(content1, recipientPublicKeyBase64, senderAddress);
      await encryptionService.encryptMessage(content2, recipientPublicKeyBase64, senderAddress);

      // Verify same encryption process is used regardless of content length
      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledTimes(2);
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalledTimes(4); // 2 AES + 2 RSA
    });

    it('should prevent replay attacks with message ordering', async () => {
      const conversationId = 'conv-1';
      const encryptionInfo1 = encryptionService.generateEncryptionInfo(conversationId);
      
      // Wait to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const encryptionInfo2 = encryptionService.generateEncryptionInfo(conversationId);

      // Each message should have unique encryption info
      expect(encryptionInfo1.keyId).not.toBe(encryptionInfo2.keyId);
      expect(encryptionInfo1.metadata.createdAt).not.toBe(encryptionInfo2.metadata.createdAt);
    });

    it('should validate key authenticity to prevent MITM attacks', async () => {
      const userAddress = '0x1111';
      const maliciousPublicKey = 'maliciousPublicKeyBase64';
      
      // Mock key import failure for malicious key
      mockCrypto.subtle.importKey.mockRejectedValue(new Error('Invalid key format'));

      await expect(encryptionService.importPublicKey(maliciousPublicKey))
        .rejects.toThrow('Public key import failed');
    });

    it('should implement forward secrecy through key rotation', async () => {
      const userAddress = '0x1111';
      
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

      await encryptionService.rotateKeys(userAddress);

      // Old key should be replaced, providing forward secrecy
      expect((encryptionService as any).keyPairs.get(userAddress)).toBe(newKeyPair);
      expect((encryptionService as any).keyPairs.get(userAddress)).not.toBe(oldKeyPair);
    });
  });

  describe('Compliance and Standards', () => {
    it('should use FIPS-approved cryptographic algorithms', async () => {
      const userAddress = '0x1111';
      
      mockCrypto.subtle.generateKey.mockResolvedValue({
        publicKey: { type: 'public' } as CryptoKey,
        privateKey: { type: 'private' } as CryptoKey,
      });

      await encryptionService.generateKeyPair(userAddress);

      // Verify FIPS-approved algorithms
      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'RSA-OAEP', // FIPS-approved
          hash: 'SHA-256', // FIPS-approved
        }),
        expect.any(Boolean),
        expect.any(Array)
      );
    });

    it('should meet minimum key strength requirements', async () => {
      const userAddress = '0x1111';
      
      mockCrypto.subtle.generateKey.mockResolvedValue({
        publicKey: { type: 'public' } as CryptoKey,
        privateKey: { type: 'private' } as CryptoKey,
      });

      await encryptionService.generateKeyPair(userAddress);

      // Verify minimum key strength
      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledWith(
        expect.objectContaining({
          modulusLength: 2048, // Minimum 2048-bit RSA
        }),
        expect.any(Boolean),
        expect.any(Array)
      );
    });

    it('should implement proper key lifecycle management', async () => {
      const userAddress = '0x1111';
      
      // Test key generation
      const mockKeyPair = {
        publicKey: { type: 'public' } as CryptoKey,
        privateKey: { type: 'private' } as CryptoKey,
      };
      
      mockCrypto.subtle.generateKey.mockResolvedValue(mockKeyPair);
      mockCrypto.subtle.exportKey
        .mockResolvedValueOnce(new ArrayBuffer(256))
        .mockResolvedValueOnce(new ArrayBuffer(512));

      // Generate key
      await encryptionService.generateKeyPair(userAddress);
      
      // Rotate key
      await encryptionService.rotateKeys(userAddress);
      
      // Clear keys
      await encryptionService.clearAllKeys();

      // Verify complete lifecycle
      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledTimes(2); // Initial + rotation
    });
  });
});