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
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('SecureKeyStorage', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  describe('storeWallet', () => {
    it('should store a wallet with encryption', async () => {
      const address = '0x' + 'a'.repeat(40);
      const privateKey = '0x' + 'b'.repeat(64);
      const password = 'test-password-123';
      const metadata = {
        name: 'Test Wallet',
        isHardwareWallet: false,
        chainIds: [1, 8453],
      };

      await SecureKeyStorage.storeWallet(address, privateKey, password, metadata);

      const stored = mockLocalStorage.getItem(`linkdao_wallet_${address.toLowerCase()}`);
      expect(stored).toBeDefined();
      
      const parsed = JSON.parse(stored as string);
      expect(parsed.encryptedKey).toBeDefined();
      expect(parsed.encryptedKey).not.toBe(privateKey); // Should be encrypted
      expect(parsed.metadata).toEqual(metadata);
    });

    it('should store wallet metadata', async () => {
      const address = '0x' + 'a'.repeat(40);
      const privateKey = '0x' + 'b'.repeat(64);
      const password = 'test-password-123';
      const metadata = {
        name: 'Test Wallet',
        isHardwareWallet: false,
        chainIds: [1, 8453],
      };

      await SecureKeyStorage.storeWallet(address, privateKey, password, metadata);

      const stored = mockLocalStorage.getItem(`linkdao_wallet_${address.toLowerCase()}`);
      const parsed = JSON.parse(stored as string);
      
      expect(parsed.metadata.name).toBe('Test Wallet');
      expect(parsed.metadata.isHardwareWallet).toBe(false);
      expect(parsed.metadata.chainIds).toEqual([1, 8453]);
    });
  });

  describe('getWallet', () => {
    it('should retrieve a wallet with correct password', async () => {
      const address = '0x' + 'a'.repeat(40);
      const privateKey = '0x' + 'b'.repeat(64);
      const password = 'test-password-123';
      const metadata = {
        name: 'Test Wallet',
        isHardwareWallet: false,
        chainIds: [1, 8453],
      };

      await SecureKeyStorage.storeWallet(address, privateKey, password, metadata);
      const retrieved = await SecureKeyStorage.getWallet(address, password);

      expect(retrieved).toBeDefined();
      expect(retrieved.privateKey).toBe(privateKey);
      expect(retrieved.metadata).toEqual(metadata);
    });

    it('should fail with wrong password', async () => {
      const address = '0x' + 'a'.repeat(40);
      const privateKey = '0x' + 'b'.repeat(64);
      const correctPassword = 'correct-password';
      const wrongPassword = 'wrong-password';
      const metadata = {
        name: 'Test Wallet',
        isHardwareWallet: false,
        chainIds: [1, 8453],
      };

      await SecureKeyStorage.storeWallet(address, privateKey, correctPassword, metadata);
      
      await expect(
        SecureKeyStorage.getWallet(address, wrongPassword)
      ).rejects.toThrow();
    });

    it('should return null for non-existent wallet', async () => {
      const address = '0x' + 'a'.repeat(40);
      const password = 'test-password';
      
      const result = await SecureKeyStorage.getWallet(address, password);
      expect(result).toBeNull();
    });
  });

  describe('listWallets', () () => {
    it('should list all stored wallets', async () => {
      const address1 = '0x' + 'a'.repeat(40);
      const address2 = '0x' + 'b'.repeat(40);
      const privateKey = '0x' + 'c'.repeat(64);
      const password = 'test-password-123';
      const metadata = {
        name: 'Test Wallet',
        isHardwareWallet: false,
        chainIds: [1, 8453],
      };

      await SecureKeyStorage.storeWallet(address1, privateKey, password, metadata);
      await SecureKeyStorage.storeWallet(address2, privateKey, password, metadata);

      const wallets = SecureKeyStorage.listWallets();
      expect(wallets).toHaveLength(2);
      expect(wallets.map((w) => w.address)).toContain(address1);
      expect(wallets.map((w) => w.address)).toContain(address2);
    });

    it('should return empty array when no wallets stored', () => {
      const wallets = SecureKeyStorage.listWallets();
      expect(wallets).toEqual([]);
    });
  });

  describe('deleteWallet', () => {
    it('should delete a wallet', async () => {
      const address = '0x' + 'a'.repeat(40);
      const privateKey = '0x' + 'b'.repeat(64);
      const password = 'test-password-123';
      const metadata = {
        name: 'Test Wallet',
        isHardwareWallet: false,
        chainIds: [1, 8453],
      };

      await SecureKeyStorage.storeWallet(address, privateKey, password, metadata);
      expect(SecureKeyStorage.listWallets()).toHaveLength(1);

      SecureKeyStorage.deleteWallet(address);
      expect(SecureKeyStorage.listWallets()).toHaveLength(0);
    });

    it('should not throw when deleting non-existent wallet', () => {
      const address = '0x' + 'a'.repeat(40);
      expect(() => {
        SecureKeyStorage.deleteWallet(address);
      }).not.toThrow();
    });
  });

  describe('getActiveWallet', () => {
    it('should return null when no active wallet', () => {
      const activeWallet = SecureKeyStorage.getActiveWallet();
      expect(activeWallet).toBeNull();
    });

    it('should return active wallet after setting', async () => {
      const address = '0x' + 'a'.repeat(40);
      const privateKey = '0x' + 'b'.repeat(64);
      const password = 'test-password-123';
      const metadata = {
        name: 'Test Wallet',
        isHardwareWallet: false,
        chainIds: [1, 8453],
      };

      await SecureKeyStorage.storeWallet(address, privateKey, password, metadata);
      SecureKeyStorage.setActiveWallet(address);

      const activeWallet = SecureKeyStorage.getActiveWallet();
      expect(activeWallet).toBe(address);
    });
  });

  describe('setActiveWallet', () => {
    it('should set active wallet', async () => {
      const address = '0x' + 'a'.repeat(40);
      const privateKey = '0x' + 'b'.repeat(64);
      const password = 'test-password-123';
      const metadata = {
        name: 'Test Wallet',
        isHardwareWallet: false,
        chainIds: [1, 8453],
      };

      await SecureKeyStorage.storeWallet(address, privateKey, password, metadata);
      SecureKeyStorage.setActiveWallet(address);

      expect(SecureKeyStorage.getActiveWallet()).toBe(address);
    });

    it('should update active wallet', () => {
      const address1 = '0x' + 'a'.repeat(40);
      const address2 = '0x' + 'b'.repeat(40);

      SecureKeyStorage.setActiveWallet(address1);
      expect(SecureKeyStorage.getActiveWallet()).toBe(address1);

      SecureKeyStorage.setActiveWallet(address2);
      expect(SecureKeyStorage.getActiveWallet()).toBe(address2);
    });
  });

  describe('clearActiveWallet', () => {
    it('should clear active wallet', () => {
      const address = '0x' + 'a'.repeat(40);

      SecureKeyStorage.setActiveWallet(address);
      expect(SecureKeyStorage.getActiveWallet()).toBe(address);

      SecureKeyStorage.clearActiveWallet();
      expect(SecureKeyStorage.getActiveWallet()).toBeNull();
    });
  });
});