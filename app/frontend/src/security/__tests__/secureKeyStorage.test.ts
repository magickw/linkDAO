/**
 * Unit Tests for Secure Key Storage
 */

import { SecureKeyStorage } from '@/security/secureKeyStorage';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    length: Object.keys(store).length,
    key: (index: number) => Object.keys(store)[index],
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('SecureKeyStorage', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  const address = '0x' + 'a'.repeat(40);
  const privateKey = '0x' + 'b'.repeat(64);
  const mnemonic = 'test junk test junk test junk test junk test junk test junk';
  const password = 'test-password-123';
  const metadata = {
    name: 'Test Wallet',
    isHardwareWallet: false,
    chainIds: [1, 8453],
  };

  describe('storeWallet', () => {
    it('should store a wallet with encryption', async () => {
      await SecureKeyStorage.storeWallet(address, privateKey, password, metadata, mnemonic);

      const stored = mockLocalStorage.getItem(`linkdao_wallet_${address.toLowerCase()}`);
      expect(stored).toBeDefined();
      
      const parsed = JSON.parse(stored as string);
      expect(parsed.encryptedPrivateKey).toBeDefined();
      expect(parsed.encryptedPrivateKey).not.toBe(privateKey);
      expect(parsed.encryptedMnemonic).toBeDefined();
      expect(parsed.encryptedMnemonic).not.toBe(mnemonic);
      expect(parsed.salt).toBeDefined();
      expect(parsed.iv).toBeDefined();

      const storedMeta = mockLocalStorage.getItem(`linkdao_wallet_${address.toLowerCase()}_metadata`);
      const parsedMeta = JSON.parse(storedMeta as string);
      expect(parsedMeta).toEqual(metadata);
    });
  });

  describe('withDecryptedWallet', () => {
    it('should retrieve and wipe a wallet with correct password', async () => {
      await SecureKeyStorage.storeWallet(address, privateKey, password, metadata, mnemonic);
      
      await SecureKeyStorage.withDecryptedWallet(address, password, async (wallet) => {
        expect(wallet).toBeDefined();
        expect(wallet.privateKey).toBe(privateKey);
        expect(wallet.mnemonic).toBe(mnemonic);
        expect(wallet.metadata).toEqual(metadata);
      });
    });

    it('should fail with wrong password', async () => {
      const wrongPassword = 'wrong-password';
      await SecureKeyStorage.storeWallet(address, privateKey, password, metadata);
      
      await expect(
        SecureKeyStorage.withDecryptedWallet(address, wrongPassword, async () => {})
      ).rejects.toThrow('Invalid password');
    });

    it('should throw for non-existent wallet', async () => {
      await expect(
        SecureKeyStorage.withDecryptedWallet('0x' + 'c'.repeat(40), password, async () => {})
      ).rejects.toThrow('Wallet not found');
    });
  });

  describe('getWallet (deprecated)', () => {
    it('should still retrieve a wallet using the deprecated method', async () => {
      await SecureKeyStorage.storeWallet(address, privateKey, password, metadata, mnemonic);
      const retrieved = await SecureKeyStorage.getWallet(address, password);

      expect(retrieved).toBeDefined();
      expect(retrieved.privateKey).toBe(privateKey);
      expect(retrieved.mnemonic).toBe(mnemonic);
      expect(retrieved.metadata).toEqual(metadata);
    });
  });

  describe('listWallets', () => {
    it('should list all stored wallet addresses', async () => {
      const address1 = '0x' + 'a'.repeat(40);
      const address2 = '0x' + 'b'.repeat(40);
      
      await SecureKeyStorage.storeWallet(address1, privateKey, password);
      await SecureKeyStorage.storeWallet(address2, privateKey, password);

      const wallets = SecureKeyStorage.listWallets();
      expect(wallets).toHaveLength(2);
      expect(wallets).toContain(address1.toLowerCase());
      expect(wallets).toContain(address2.toLowerCase());
    });

    it('should return empty array when no wallets stored', () => {
      const wallets = SecureKeyStorage.listWallets();
      expect(wallets).toEqual([]);
    });
  });

  describe('deleteWallet', () => {
    it('should delete a wallet and its metadata', async () => {
      await SecureKeyStorage.storeWallet(address, privateKey, password, metadata);
      expect(mockLocalStorage.getItem(`linkdao_wallet_${address.toLowerCase()}`)).not.toBeNull();
      expect(mockLocalStorage.getItem(`linkdao_wallet_${address.toLowerCase()}_metadata`)).not.toBeNull();

      await SecureKeyStorage.deleteWallet(address);
      expect(mockLocalStorage.getItem(`linkdao_wallet_${address.toLowerCase()}`)).toBeNull();
      expect(mockLocalStorage.getItem(`linkdao_wallet_${address.toLowerCase()}_metadata`)).toBeNull();
    });
  });

  describe('Active Wallet Management', () => {
    it('should set and get the active wallet', () => {
      SecureKeyStorage.setActiveWallet(address);
      expect(SecureKeyStorage.getActiveWallet()).toBe(address.toLowerCase());
    });
    
    it('should clear the active wallet', () => {
      SecureKeyStorage.setActiveWallet(address);
      SecureKeyStorage.clearActiveWallet();
      expect(SecureKeyStorage.getActiveWallet()).toBeNull();
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      await SecureKeyStorage.storeWallet(address, privateKey, password);
      const isValid = await SecureKeyStorage.verifyPassword(address, password);
      expect(isValid).toBe(true);
    });

    it('should throw for incorrect password', async () => {
      await SecureKeyStorage.storeWallet(address, privateKey, password);
      await expect(
        SecureKeyStorage.verifyPassword(address, 'wrong-password')
      ).rejects.toThrow('Invalid password');
    });
  });

  describe('changePassword', () => {
    it('should successfully change the password', async () => {
      const newPassword = 'new-password-456';
      await SecureKeyStorage.storeWallet(address, privateKey, password, metadata, mnemonic);

      await SecureKeyStorage.changePassword(address, password, newPassword);

      // Verify with new password
      await SecureKeyStorage.withDecryptedWallet(address, newPassword, async (wallet) => {
        expect(wallet.privateKey).toBe(privateKey);
        expect(wallet.mnemonic).toBe(mnemonic);
      });
      
      // Old password should fail
      await expect(
        SecureKeyStorage.withDecryptedWallet(address, password, async () => {})
      ).rejects.toThrow('Invalid password');
    });
  });
});