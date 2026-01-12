/**
 * BIP-39 Utilities
 * Proper BIP-39 mnemonic generation, validation, and key derivation
 */

import { HDNodeWallet, Mnemonic, entropyToMnemonic, mnemonicToEntropy, wordlist } from 'ethers';

/**
 * Generate a new BIP-39 mnemonic phrase
 * @param wordCount Number of words (12 or 24)
 * @returns Mnemonic phrase
 */
export function generateMnemonic(wordCount: 12 | 24 = 12): string {
  const entropyBytes = wordCount === 12 ? 16 : 32; // 128 bits for 12 words, 256 bits for 24 words
  const entropy = Mnemonic.entropyToPhrase(crypto.getRandomValues(new Uint8Array(entropyBytes)));
  return entropy;
}

/**
 * Validate a BIP-39 mnemonic phrase
 * @param mnemonic Mnemonic phrase to validate
 * @returns True if valid
 */
export function validateMnemonic(mnemonic: string): boolean {
  try {
    Mnemonic.fromPhrase(mnemonic);
    return true;
  } catch {
    return false;
  }
}

/**
 * Derive a private key from a mnemonic phrase
 * @param mnemonic Mnemonic phrase
 * @param derivationPath BIP-32/44 derivation path (default: m/44'/60'/0'/0/0 for Ethereum)
 * @param index Account index
 * @returns Private key
 */
export function derivePrivateKeyFromMnemonic(
  mnemonic: string,
  derivationPath: string = "m/44'/60'/0'/0/0",
  index: number = 0
): string {
  try {
    const hdNode = HDNodeWallet.fromPhrase(mnemonic);
    const path = derivationPath.replace(/\/0$/, `/${index}`);
    const wallet = hdNode.derivePath(path);
    return wallet.privateKey;
  } catch (error: any) {
    throw new Error(`Failed to derive private key: ${error.message}`);
  }
}

/**
 * Derive an Ethereum address from a private key
 * @param privateKey Private key
 * @returns Ethereum address
 */
export function deriveAddressFromPrivateKey(privateKey: string): string {
  try {
    const wallet = new HDNodeWallet(privateKey);
    return wallet.address;
  } catch (error: any) {
    throw new Error(`Failed to derive address: ${error.message}`);
  }
}

/**
 * Derive an Ethereum address from a mnemonic phrase
 * @param mnemonic Mnemonic phrase
 * @param derivationPath BIP-32/44 derivation path
 * @param index Account index
 * @returns Ethereum address
 */
export function deriveAddressFromMnemonic(
  mnemonic: string,
  derivationPath: string = "m/44'/60'/0'/0/0",
  index: number = 0
): string {
  const privateKey = derivePrivateKeyFromMnemonic(mnemonic, derivationPath, index);
  return deriveAddressFromPrivateKey(privateKey);
}

/**
 * Get word list for a specific language
 * @param language Language code (default: 'en')
 * @returns Word list
 */
export function getWordList(language: string = 'en'): string[] {
  return wordlist;
}

/**
 * Calculate checksum for a mnemonic
 * @param mnemonic Mnemonic phrase
 * @returns Checksum bits
 */
export function calculateChecksum(mnemonic: string): number {
  try {
    const entropy = mnemonicToEntropy(mnemonic);
    const checksumLength = entropy.length / 32;
    return checksumLength;
  } catch {
    return 0;
  }
}

/**
 * Get entropy from mnemonic
 * @param mnemonic Mnemonic phrase
 * @returns Entropy bytes
 */
export function getEntropyFromMnemonic(mnemonic: string): Uint8Array {
  try {
    const entropy = mnemonicToEntropy(mnemonic);
    return new Uint8Array(Buffer.from(entropy.slice(2), 'hex'));
  } catch {
    return new Uint8Array();
  }
}

/**
 * Generate multiple addresses from a single mnemonic
 * @param mnemonic Mnemonic phrase
 * @param count Number of addresses to generate
 * @param startIndex Starting index
 * @param derivationPath BIP-32/44 derivation path
 * @returns Array of addresses with their private keys
 */
export function generateAddressesFromMnemonic(
  mnemonic: string,
  count: number,
  startIndex: number = 0,
  derivationPath: string = "m/44'/60'/0'/0"
): Array<{ address: string; privateKey: string; index: number }> {
  const addresses: Array<{ address: string; privateKey: string; index: number }> = [];

  for (let i = startIndex; i < startIndex + count; i++) {
    try {
      const privateKey = derivePrivateKeyFromMnemonic(mnemonic, derivationPath, i);
      const address = deriveAddressFromPrivateKey(privateKey);
      addresses.push({ address, privateKey, index: i });
    } catch (error) {
      console.error(`Failed to generate address at index ${i}:`, error);
    }
  }

  return addresses;
}

/**
 * Validate private key format
 * @param privateKey Private key to validate
 * @returns True if valid
 */
export function validatePrivateKey(privateKey: string): boolean {
  try {
    // Check if it's a valid hex string
    if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
      return false;
    }

    // Try to create a wallet from it
    const wallet = new HDNodeWallet(privateKey);
    return !!wallet.address;
  } catch {
    return false;
  }
}

/**
 * Get account info from mnemonic
 * @param mnemonic Mnemonic phrase
 * @param index Account index
 * @returns Account information
 */
export function getAccountInfo(
  mnemonic: string,
  index: number = 0
): {
  address: string;
  privateKey: string;
  publicKey: string;
  derivationPath: string;
} {
  const derivationPath = `m/44'/60'/0'/0/${index}`;
  const privateKey = derivePrivateKeyFromMnemonic(mnemonic, derivationPath, index);
  const address = deriveAddressFromPrivateKey(privateKey);
  const wallet = new HDNodeWallet(privateKey);

  return {
    address,
    privateKey,
    publicKey: wallet.publicKey,
    derivationPath,
  };
}

/**
 * Encrypt mnemonic with password (for backup)
 * @param mnemonic Mnemonic phrase
 * @param password Password for encryption
 * @returns Encrypted data
 */
export async function encryptMnemonic(
  mnemonic: string,
  password: string
): Promise<{ encrypted: string; salt: string; iv: string }> {
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);

  // Generate salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(16));

  // Derive key
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBytes,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  // Encrypt
  const mnemonicBytes = encoder.encode(mnemonic);
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    mnemonicBytes
  );

  return {
    encrypted: Buffer.from(encrypted).toString('hex'),
    salt: Buffer.from(salt).toString('hex'),
    iv: Buffer.from(iv).toString('hex'),
  };
}

/**
 * Decrypt mnemonic with password
 * @param encrypted Encrypted mnemonic
 * @param salt Salt used for encryption
 * @param iv IV used for encryption
 * @param password Password for decryption
 * @returns Decrypted mnemonic
 */
export async function decryptMnemonic(
  encrypted: string,
  salt: string,
  iv: string,
  password: string
): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const passwordBytes = encoder.encode(password);

  // Derive key
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBytes,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: Buffer.from(salt, 'hex'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  // Decrypt
  const encryptedBytes = Buffer.from(encrypted, 'hex');
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: Buffer.from(iv, 'hex'),
    },
    key,
    encryptedBytes
  );

  return decoder.decode(decrypted);
}