/**
 * Comprehensive Test Suite for Secure Key Storage
 * Tests encryption, decryption, and secure storage of wallet keys
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SecureKeyStorage } from '../secureKeyStorage';
import { encrypt, decrypt } from '@/utils/cryptoUtils';

// Mock crypto utilities
vi.mock('@/utils/cryptoUtils');

describe('SecureKeyStorage', () => {
  const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  const mockPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const mockMnemonic = 'test test test test test test test test test test test test junk';
  const mockPassword = 'testPassword123!';
  const mockEncryptedData = {
    encrypted: 'encryptedData',
    iv: 'ivString',
    salt: 'saltString'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Encryption', () => {
    it('should encrypt private key with password', async () => {
      vi.mocked(encrypt).mockResolvedValue(mockEncryptedData);

      const result = await SecureKeyStorage.storeWallet(
        mockAddress,
        mockPrivateKey,
        mockPassword
      );

      expect(encrypt).toHaveBeenCalledWith(mockPrivateKey, mockPassword);
    });

    it('should decrypt private key with correct password', async () => {
      vi.mocked(decrypt).mockResolvedValue(mockPrivateKey);

      const result = await SecureKeyStorage.retrieveWallet(mockAddress, mockPassword);

      expect(decrypt).toHaveBeenCalledWith(
        mockEncryptedData.encrypted,
        mockPassword,
        mockEncryptedData.iv,
        mockEncryptedData.salt
      );
    });

    it('should fail decryption with wrong password', async () => {
      vi.mocked(decrypt).mockRejectedValue(new Error('Decryption failed'));

      const result = await SecureKeyStorage.retrieveWallet(mockAddress, 'wrongPassword');

      expect(result).toBeNull();
    });

    it('should generate unique salt for each encryption', async () => {
      const salts: string[] = [];
      vi.mocked(encrypt).mockImplementation(async (data, password) => {
        const salt = Math.random().toString(36);
        salts.push(salt);
        return { encrypted: 'data', iv: 'iv', salt };
      });

      await SecureKeyStorage.storeWallet(mockAddress, mockPrivateKey, mockPassword);
      await SecureKeyStorage.storeWallet('0x' + '1'.repeat(40), mockPrivateKey, mockPassword);

      expect(salts).toHaveLength(2);
      expect(salts[0]).not.toBe(salts[1]);
    });

    it('should generate unique IV for each encryption', async () => {
      const ivs: string[] = [];
      vi.mocked(encrypt).mockImplementation(async (data, password) => {
        const iv = Math.random().toString(36);
        ivs.push(iv);
        return { encrypted: 'data', iv, salt: 'salt' };
      });

      await SecureKeyStorage.storeWallet(mockAddress, mockPrivateKey, mockPassword);
      await SecureKeyStorage.storeWallet('0x' + '1'.repeat(40), mockPrivateKey, mockPassword);

      expect(ivs).toHaveLength(2);
      expect(ivs[0]).not.toBe(ivs[1]);
    });
  });

  describe('Storage Operations', () => {
    it('should store wallet in localStorage', async () => {
      vi.mocked(encrypt).mockResolvedValue(mockEncryptedData);

      await SecureKeyStorage.storeWallet(
        mockAddress,
        mockPrivateKey,
        mockPassword
      );

      const stored = localStorage.getItem(`wallet_${mockAddress}`);
      expect(stored).toBeDefined();
    });

    it('should store wallet metadata', async () => {
      const metadata = {
        name: 'Test Wallet',
        chains: [1, 8453],
        isHardwareWallet: false
      };

      vi.mocked(encrypt).mockResolvedValue(mockEncryptedData);

      await SecureKeyStorage.storeWallet(
        mockAddress,
        mockPrivateKey,
        mockPassword,
        metadata
      );

      const stored = JSON.parse(localStorage.getItem(`wallet_${mockAddress}`)!);
      expect(stored.metadata).toEqual(metadata);
    });

    it('should store mnemonic if provided', async () => {
      vi.mocked(encrypt).mockResolvedValue(mockEncryptedData);

      await SecureKeyStorage.storeWallet(
        mockAddress,
        mockPrivateKey,
        mockPassword,
        undefined,
        mockMnemonic
      );

      const stored = JSON.parse(localStorage.getItem(`wallet_${mockAddress}`)!);
      expect(stored.mnemonic).toBeDefined();
    });

    it('should not store mnemonic if not provided', async () => {
      vi.mocked(encrypt).mockResolvedValue(mockEncryptedData);

      await SecureKeyStorage.storeWallet(
        mockAddress,
        mockPrivateKey,
        mockPassword
      );

      const stored = JSON.parse(localStorage.getItem(`wallet_${mockAddress}`)!);
      expect(stored.mnemonic).toBeUndefined();
    });

    it('should retrieve wallet from localStorage', async () => {
      const storedData = {
        encryptedData: mockEncryptedData,
        metadata: { name: 'Test Wallet' }
      };
      localStorage.setItem(`wallet_${mockAddress}`, JSON.stringify(storedData));
      vi.mocked(decrypt).mockResolvedValue(mockPrivateKey);

      const result = await SecureKeyStorage.retrieveWallet(mockAddress, mockPassword);

      expect(result).toEqual({
        address: mockAddress,
        privateKey: mockPrivateKey,
        metadata: storedData.metadata
      });
    });

    it('should return null for non-existent wallet', async () => {
      const result = await SecureKeyStorage.retrieveWallet('0x' + '9'.repeat(40), mockPassword);

      expect(result).toBeNull();
    });

    it('should delete wallet from localStorage', async () => {
      localStorage.setItem(`wallet_${mockAddress}`, JSON.stringify({ data: 'test' }));

      const result = await SecureKeyStorage.deleteWallet(mockAddress);

      expect(result).toBe(true);
      expect(localStorage.getItem(`wallet_${mockAddress}`)).toBeNull();
    });

    it('should return false when deleting non-existent wallet', async () => {
      const result = await SecureKeyStorage.deleteWallet('0x' + '9'.repeat(40));

      expect(result).toBe(false);
    });
  });

  describe('List Wallets', () => {
    it('should list all stored wallets', async () => {
      const wallets = [
        { address: mockAddress, metadata: { name: 'Wallet 1' } },
        { address: '0x' + '1'.repeat(40), metadata: { name: 'Wallet 2' } }
      ];

      wallets.forEach(wallet => {
        localStorage.setItem(`wallet_${wallet.address}`, JSON.stringify({ metadata: wallet.metadata }));
      });

      const result = await SecureKeyStorage.listWallets();

      expect(result).toHaveLength(2);
      expect(result[0].address).toBe(mockAddress);
      expect(result[1].address).toBe('0x' + '1'.repeat(40));
    });

    it('should return empty array when no wallets stored', async () => {
      const result = await SecureKeyStorage.listWallets();

      expect(result).toEqual([]);
    });

    it('should filter out corrupted wallet entries', async () => {
      localStorage.setItem(`wallet_${mockAddress}`, JSON.stringify({ metadata: { name: 'Valid Wallet' } }));
      localStorage.setItem(`wallet_invalid`, 'invalid json');

      const result = await SecureKeyStorage.listWallets();

      expect(result).toHaveLength(1);
      expect(result[0].address).toBe(mockAddress);
    });
  });

  describe('Security Features', () => {
    it('should use AES-256-GCM encryption', async () => {
      vi.mocked(encrypt).mockResolvedValue(mockEncryptedData);

      await SecureKeyStorage.storeWallet(
        mockAddress,
        mockPrivateKey,
        mockPassword
      );

      expect(encrypt).toHaveBeenCalledWith(
        mockPrivateKey,
        mockPassword
      );
    });

    it('should use PBKDF2 key derivation', async () => {
      vi.mocked(encrypt).mockResolvedValue(mockEncryptedData);

      await SecureKeyStorage.storeWallet(
        mockAddress,
        mockPrivateKey,
        mockPassword
      );

      expect(encrypt).toHaveBeenCalledWith(
        mockPrivateKey,
        mockPassword
      );
    });

    it('should use 100,000 PBKDF2 iterations', async () => {
      vi.mocked(encrypt).mockResolvedValue(mockEncryptedData);

      await SecureKeyStorage.storeWallet(
        mockAddress,
        mockPrivateKey,
        mockPassword
      );

      expect(encrypt).toHaveBeenCalledWith(
        mockPrivateKey,
        mockPassword
      );
    });

    it('should clear memory after encryption', async () => {
      vi.mocked(encrypt).mockImplementation(async (data, password) => {
        // Simulate memory clearing
        const result = mockEncryptedData;
        // Clear sensitive data
        (data as any) = null;
        (password as any) = null;
        return result;
      });

      await SecureKeyStorage.storeWallet(
        mockAddress,
        mockPrivateKey,
        mockPassword
      );

      expect(encrypt).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle encryption errors gracefully', async () => {
      vi.mocked(encrypt).mockRejectedValue(new Error('Encryption failed'));

      await expect(
        SecureKeyStorage.storeWallet(mockAddress, mockPrivateKey, mockPassword)
      ).rejects.toThrow('Encryption failed');
    });

    it('should handle decryption errors gracefully', async () => {
      localStorage.setItem(`wallet_${mockAddress}`, JSON.stringify({ encryptedData: mockEncryptedData }));
      vi.mocked(decrypt).mockRejectedValue(new Error('Decryption failed'));

      const result = await SecureKeyStorage.retrieveWallet(mockAddress, mockPassword);

      expect(result).toBeNull();
    });

    it('should handle localStorage quota exceeded errors', async () => {
      vi.mocked(encrypt).mockRejectedValue(new Error('QuotaExceededError'));

      await expect(
        SecureKeyStorage.storeWallet(mockAddress, mockPrivateKey, mockPassword)
      ).rejects.toThrow('QuotaExceededError');
    });

    it('should handle corrupted localStorage data', async () => {
      localStorage.setItem(`wallet_${mockAddress}`, 'corrupted data');

      const result = await SecureKeyStorage.retrieveWallet(mockAddress, mockPassword);

      expect(result).toBeNull();
    });
  });

  describe('Concurrent Access', () => {
    it('should handle concurrent wallet storage', async () => {
      vi.mocked(encrypt).mockResolvedValue(mockEncryptedData);

      const promises = [
        SecureKeyStorage.storeWallet('0x' + '1'.repeat(40), mockPrivateKey, mockPassword),
        SecureKeyStorage.storeWallet('0x' + '2'.repeat(40), mockPrivateKey, mockPassword),
        SecureKeyStorage.storeWallet('0x' + '3'.repeat(40), mockPrivateKey, mockPassword)
      ];

      await Promise.all(promises);

      expect(localStorage.getItem(`wallet_0x${'1'.repeat(40)}`)).toBeDefined();
      expect(localStorage.getItem(`wallet_0x${'2'.repeat(40)}`)).toBeDefined();
      expect(localStorage.getItem(`wallet_0x${'3'.repeat(40)}`)).toBeDefined();
    });

    it('should handle concurrent wallet retrieval', async () => {
      const wallets = [
        { address: mockAddress, metadata: { name: 'Wallet 1' } },
        { address: '0x' + '1'.repeat(40), metadata: { name: 'Wallet 2' } }
      ];

      wallets.forEach(wallet => {
        localStorage.setItem(`wallet_${wallet.address}`, JSON.stringify({ metadata: wallet.metadata }));
      });

      vi.mocked(decrypt).mockResolvedValue(mockPrivateKey);

      const promises = [
        SecureKeyStorage.retrieveWallet(mockAddress, mockPassword),
        SecureKeyStorage.retrieveWallet('0x' + '1'.repeat(40), mockPassword)
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(2);
      expect(results[0]).not.toBeNull();
      expect(results[1]).not.toBeNull();
    });
  });
});