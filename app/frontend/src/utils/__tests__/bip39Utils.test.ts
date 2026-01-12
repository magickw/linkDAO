/**
 * Unit Tests for BIP-39 Utilities
 */

import {
  generateMnemonic,
  validateMnemonic,
  derivePrivateKeyFromMnemonic,
  deriveAddressFromPrivateKey,
  deriveAddressFromMnemonic,
  encryptMnemonic,
  decryptMnemonic,
  validatePrivateKey,
  getAccountInfo,
  generateAddressesFromMnemonic,
} from '@/utils/bip39Utils';

describe('BIP-39 Utils', () => {
  describe('generateMnemonic', () => {
    it('should generate a 12-word mnemonic', () => {
      const mnemonic = generateMnemonic(12);
      expect(mnemonic).toBeDefined();
      const words = mnemonic.split(' ');
      expect(words).toHaveLength(12);
      expect(words.every((word) => typeof word === 'string')).toBe(true);
    });

    it('should generate a 24-word mnemonic', () => {
      const mnemonic = generateMnemonic(24);
      expect(mnemonic).toBeDefined();
      const words = mnemonic.split(' ');
      expect(words).toHaveLength(24);
      expect(words.every((word) => typeof word === 'string')).toBe(true);
    });

    it('should generate different mnemonics each time', () => {
      const mnemonic1 = generateMnemonic(12);
      const mnemonic2 = generateMnemonic(12);
      expect(mnemonic1).not.toBe(mnemonic2);
    });
  });

  describe('validateMnemonic', () => {
    it('should validate a correct 12-word mnemonic', () => {
      const mnemonic = generateMnemonic(12);
      expect(validateMnemonic(mnemonic)).toBe(true);
    });

    it('should validate a correct 24-word mnemonic', () => {
      const mnemonic = generateMnemonic(24);
      expect(validateMnemonic(mnemonic)).toBe(true);
    });

    it('should reject an invalid mnemonic', () => {
      expect(validateMnemonic('invalid mnemonic phrase')).toBe(false);
    });

    it('should reject a mnemonic with wrong word count', () => {
      expect(validateMnemonic('word1 word2 word3')).toBe(false);
    });
  });

  describe('derivePrivateKeyFromMnemonic', () => {
    it('should derive a private key from mnemonic', () => {
      const mnemonic = generateMnemonic(12);
      const privateKey = derivePrivateKeyFromMnemonic(mnemonic);
      expect(privateKey).toBeDefined();
      expect(privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('should derive same private key for same mnemonic', () => {
      const mnemonic = generateMnemonic(12);
      const privateKey1 = derivePrivateKeyFromMnemonic(mnemonic);
      const privateKey2 = derivePrivateKeyFromMnemonic(mnemonic);
      expect(privateKey1).toBe(privateKey2);
    });

    it('should derive different private keys for different indices', () => {
      const mnemonic = generateMnemonic(12);
      const privateKey0 = derivePrivateKeyFromMnemonic(mnemonic, "m/44'/60'/0'/0/0", 0);
      const privateKey1 = derivePrivateKeyFromMnemonic(mnemonic, "m/44'/60'/0'/0/0", 1);
      expect(privateKey0).not.toBe(privateKey1);
    });
  });

  describe('deriveAddressFromPrivateKey', () => {
    it('should derive an Ethereum address from private key', () => {
      const mnemonic = generateMnemonic(12);
      const privateKey = derivePrivateKeyFromMnemonic(mnemonic);
      const address = deriveAddressFromPrivateKey(privateKey);
      expect(address).toBeDefined();
      expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should derive same address for same private key', () => {
      const mnemonic = generateMnemonic(12);
      const privateKey = derivePrivateKeyFromMnemonic(mnemonic);
      const address1 = deriveAddressFromPrivateKey(privateKey);
      const address2 = deriveAddressFromPrivateKey(privateKey);
      expect(address1).toBe(address2);
    });
  });

  describe('deriveAddressFromMnemonic', () => {
    it('should derive an address from mnemonic', () => {
      const mnemonic = generateMnemonic(12);
      const address = deriveAddressFromMnemonic(mnemonic);
      expect(address).toBeDefined();
      expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should derive same address as from private key', () => {
      const mnemonic = generateMnemonic(12);
      const privateKey = derivePrivateKeyFromMnemonic(mnemonic);
      const addressFromMnemonic = deriveAddressFromMnemonic(mnemonic);
      const addressFromPrivateKey = deriveAddressFromPrivateKey(privateKey);
      expect(addressFromMnemonic).toBe(addressFromPrivateKey);
    });
  });

  describe('validatePrivateKey', () => {
    it('should validate a correct private key', () => {
      const mnemonic = generateMnemonic(12);
      const privateKey = derivePrivateKeyFromMnemonic(mnemonic);
      expect(validatePrivateKey(privateKey)).toBe(true);
    });

    it('should reject an invalid private key', () => {
      expect(validatePrivateKey('0x123456')).toBe(false);
      expect(validatePrivateKey('invalid')).toBe(false);
    });

    it('should reject a private key without 0x prefix', () => {
      const mnemonic = generateMnemonic(12);
      const privateKey = derivePrivateKeyFromMnemonic(mnemonic);
      expect(validatePrivateKey(privateKey.slice(2))).toBe(false);
    });
  });

  describe('getAccountInfo', () => {
    it('should return account info for a mnemonic', () => {
      const mnemonic = generateMnemonic(12);
      const accountInfo = getAccountInfo(mnemonic, 0);
      
      expect(accountInfo).toBeDefined();
      expect(accountInfo.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(accountInfo.privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(accountInfo.derivationPath).toBe("m/44'/60'/0'/0/0");
    });
  });

  describe('generateAddressesFromMnemonic', () => {
    it('should generate multiple addresses from mnemonic', () => {
      const mnemonic = generateMnemonic(12);
      const addresses = generateAddressesFromMnemonic(mnemonic, 3, 0);
      
      expect(addresses).toHaveLength(3);
      expect(addresses[0].index).toBe(0);
      expect(addresses[1].index).toBe(1);
      expect(addresses[2].index).toBe(2);
      expect(addresses.every((addr) => addr.address.match(/^0x[a-fA-F0-9]{40}$/))).toBe(true);
    });

    it('should generate sequential addresses', () => {
      const mnemonic = generateMnemonic(12);
      const addresses = generateAddressesFromMnemonic(mnemonic, 2, 0);
      
      expect(addresses[0].address).not.toBe(addresses[1].address);
    });
  });

  describe('encryptMnemonic and decryptMnemonic', () => {
    it('should encrypt and decrypt a mnemonic', async () => {
      const mnemonic = generateMnemonic(12);
      const password = 'test-password-123';
      
      const encrypted = await encryptMnemonic(mnemonic, password);
      expect(encrypted.encrypted).toBeDefined();
      expect(encrypted.salt).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      
      const decrypted = await decryptMnemonic(
        encrypted.encrypted,
        encrypted.salt,
        encrypted.iv,
        password
      );
      expect(decrypted).toBe(mnemonic);
    });

    it('should fail to decrypt with wrong password', async () => {
      const mnemonic = generateMnemonic(12);
      const password = 'correct-password';
      const wrongPassword = 'wrong-password';
      
      const encrypted = await encryptMnemonic(mnemonic, password);
      
      await expect(
        decryptMnemonic(
          encrypted.encrypted,
          encrypted.salt,
          encrypted.iv,
          wrongPassword
        )
      ).rejects.toThrow();
    });

    it('should generate different encrypted data for same mnemonic', async () => {
      const mnemonic = generateMnemonic(12);
      const password = 'test-password-123';
      
      const encrypted1 = await encryptMnemonic(mnemonic, password);
      const encrypted2 = await encryptMnemonic(mnemonic, password);
      
      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
      expect(encrypted1.salt).not.toBe(encrypted2.salt);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });
  });
});