/**
 * Comprehensive Test Suite for Secure Key Storage
 * Tests encryption/decryption, storage operations, and security features
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SecureKeyStorage } from '../../security/secureKeyStorage';
import * as cryptoUtils from '@/utils/cryptoUtils';
import { rateLimiter } from '@/services/rateLimiter';

// Mock dependencies
jest.mock('@/utils/cryptoUtils', () => ({
  encrypt: jest.fn(),
  decrypt: jest.fn(),
}));

jest.mock('@/services/rateLimiter', () => ({
  rateLimiter: {
    isAllowed: jest.fn(),
    getTimeUntilUnblocked: jest.fn(),
    recordAttempt: jest.fn(),
  },
}));

describe('SecureKeyStorage', () => {
  const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  const mockPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const mockPassword = 'testPassword123!';
  const mockEncryptedData = {
    encrypted: 'encrypted-data',
    iv: 'mock-iv',
    salt: 'mock-salt',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    // Default mock implementations
    (cryptoUtils.encrypt as any).mockResolvedValue(mockEncryptedData);
    (cryptoUtils.decrypt as any).mockResolvedValue(mockPrivateKey);
    (rateLimiter.isAllowed as any).mockReturnValue({ allowed: true, remainingAttempts: 5 });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Storage Operations', () => {
    it('should store wallet securely', async () => {
      await SecureKeyStorage.storeWallet(
        mockAddress,
        mockPrivateKey,
        mockPassword,
        { name: 'Test Wallet', isHardwareWallet: false, chainIds: [1] }
      );

      const storedData = localStorage.getItem(`linkdao_wallet_${mockAddress.toLowerCase()}`);
      const storedMetadata = localStorage.getItem(`linkdao_wallet_${mockAddress.toLowerCase()}_metadata`);

      expect(storedData).toBeTruthy();
      expect(storedMetadata).toBeTruthy();

      const parsedData = JSON.parse(storedData!);
      expect(parsedData.address).toBe(mockAddress.toLowerCase());
      expect(parsedData.encryptedPrivateKey).toBe(mockEncryptedData.encrypted);
      expect(parsedData.iv).toBe(mockEncryptedData.iv);
      expect(parsedData.salt).toBe(mockEncryptedData.salt);
    });

    it('should throw error if wallet already exists', async () => {
      // Store first time
      await SecureKeyStorage.storeWallet(mockAddress, mockPrivateKey, mockPassword);

      // Try storing again
      await expect(
        SecureKeyStorage.storeWallet(mockAddress, mockPrivateKey, mockPassword)
      ).rejects.toThrow('Failed to store wallet securely');
    });

    it('should store active wallet reference', async () => {
      await SecureKeyStorage.storeWallet(mockAddress, mockPrivateKey, mockPassword);
      
      const activeWallet = SecureKeyStorage.getActiveWallet();
      expect(activeWallet).toBe(mockAddress.toLowerCase());
    });
  });

  describe('Decryption & Access', () => {
    beforeEach(async () => {
      // Setup: Store a wallet first
      await SecureKeyStorage.storeWallet(mockAddress, mockPrivateKey, mockPassword);
    });

    it('should execute callback with decrypted data', async () => {
      const callback = jest.fn<any>().mockResolvedValue('success');

      const result = await SecureKeyStorage.withDecryptedWallet(
        mockAddress,
        mockPassword,
        callback as any
      );

      expect(result).toBe('success');
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        privateKey: mockPrivateKey,
      }));
      expect(cryptoUtils.decrypt).toHaveBeenCalled();
    });

    it('should handle decryption failure (wrong password)', async () => {
      (cryptoUtils.decrypt as any).mockRejectedValue(new Error('Decryption failed'));

      await expect(
        SecureKeyStorage.withDecryptedWallet(mockAddress, 'wrong-password', async () => {})
      ).rejects.toThrow('Invalid password');
    });

    it('should verify password successfully', async () => {
      const isValid = await SecureKeyStorage.verifyPassword(mockAddress, mockPassword);
      expect(isValid).toBe(true);
    });

    it('should return false for invalid password verification', async () => {
      (cryptoUtils.decrypt as any).mockRejectedValue(new Error('Decryption failed'));
      
      await expect(
        SecureKeyStorage.verifyPassword(mockAddress, 'wrong-password')
      ).rejects.toThrow('Invalid password');
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(async () => {
      await SecureKeyStorage.storeWallet(mockAddress, mockPrivateKey, mockPassword);
    });

    it('should check rate limits before verification', async () => {
      await SecureKeyStorage.verifyPassword(mockAddress, mockPassword);
      expect(rateLimiter.isAllowed).toHaveBeenCalledWith(mockAddress.toLowerCase(), 'password');
    });

    it('should block verification if rate limit exceeded', async () => {
      (rateLimiter.isAllowed as any).mockReturnValue({ allowed: false, remainingAttempts: 0 });
      (rateLimiter.getTimeUntilUnblocked as any).mockReturnValue(60000); // 1 minute

      await expect(
        SecureKeyStorage.verifyPassword(mockAddress, mockPassword)
      ).rejects.toThrow(/Too many password attempts/);
    });

    it('should record failed attempts', async () => {
      (cryptoUtils.decrypt as any).mockRejectedValue(new Error('Decryption failed'));

      try {
        await SecureKeyStorage.verifyPassword(mockAddress, 'wrong-password');
      } catch (e) {
        // Expected error
      }

      expect(rateLimiter.recordAttempt).toHaveBeenCalledWith(
        mockAddress.toLowerCase(), 
        'password', 
        false
      );
    });
  });

  describe('Wallet Management', () => {
    beforeEach(async () => {
      await SecureKeyStorage.storeWallet(mockAddress, mockPrivateKey, mockPassword);
    });

    it('should delete wallet', async () => {
      await SecureKeyStorage.deleteWallet(mockAddress);

      const storedData = localStorage.getItem(`linkdao_wallet_${mockAddress.toLowerCase()}`);
      expect(storedData).toBeNull();
    });

    it('should list all wallets', async () => {
      const wallet2 = '0x1234567890123456789012345678901234567890';
      await SecureKeyStorage.storeWallet(wallet2, mockPrivateKey, mockPassword);

      const wallets = SecureKeyStorage.listWallets();
      expect(wallets).toContain(mockAddress.toLowerCase());
      expect(wallets).toContain(wallet2.toLowerCase());
      expect(wallets.length).toBe(2);
    });

    it('should change password', async () => {
      const newPassword = 'newPassword456!';
      
      await SecureKeyStorage.changePassword(mockAddress, mockPassword, newPassword);

      expect(cryptoUtils.encrypt).toHaveBeenCalledWith(expect.anything(), newPassword);
    });
  });

  describe('Import/Export', () => {
    beforeEach(async () => {
      await SecureKeyStorage.storeWallet(mockAddress, mockPrivateKey, mockPassword);
    });

    it('should export wallet securely', async () => {
      const exportData = await SecureKeyStorage.exportWallet(mockAddress, mockPassword);
      
      expect(typeof exportData).toBe('string');
      // Should be base64 encoded JSON
      expect(() => atob(exportData)).not.toThrow();
    });

    it('should import wallet from backup', async () => {
      // Mock export format
      const backupData = JSON.stringify({
        version: 1,
        encrypted: 'mock-encrypted-export',
        iv: 'mock-iv',
        salt: 'mock-salt'
      });
      const encodedBackup = btoa(backupData);

      // Mock decryption of backup
      (cryptoUtils.decrypt as any).mockResolvedValueOnce(JSON.stringify({
        address: '0x9999...',
        privateKey: mockPrivateKey,
        metadata: { name: 'Imported' }
      }));

      const importedAddress = await SecureKeyStorage.importWallet(encodedBackup, mockPassword);
      
      expect(importedAddress).toBe('0x9999...');
    });
  });
});
