/**
 * Cryptographic Utilities
 * Provides encryption and decryption functions for secure data storage
 */

export interface EncryptedData {
  encrypted: string;
  iv: string;
  salt: string;
}

/**
 * Derive a key from a password using PBKDF2
 */
async function deriveKey(
  password: string,
  salt: string
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Helper to safely get random values
 */
function safeGetRandomValues(array: Uint8Array): void {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(array);
  } else if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.getRandomValues === 'function') {
    window.crypto.getRandomValues(array);
  } else {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodeCrypto = require('crypto');
      if (nodeCrypto.randomFillSync) {
        nodeCrypto.randomFillSync(array);
        return;
      }
      if (nodeCrypto.randomBytes) {
        const bytes = nodeCrypto.randomBytes(array.length);
        array.set(bytes);
        return;
      }
    } catch (e) {
      // Fallback
    }
    
    // Insecure fallback
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
}

/**
 * Generate a random salt
 */
function generateSalt(): string {
  const array = new Uint8Array(16);
  safeGetRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a random IV
 */
function generateIV(): string {
  const array = new Uint8Array(12);
  safeGetRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Encrypt data using AES-GCM
 */
export async function encrypt(
  data: string,
  password: string
): Promise<EncryptedData> {
  try {
    const salt = generateSalt();
    const iv = generateIV();
    const key = await deriveKey(password, salt);

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const ivBuffer = new Uint8Array(iv.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer,
      },
      key,
      dataBuffer
    );

    const encrypted = Array.from(new Uint8Array(encryptedBuffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

    return { encrypted, iv, salt };
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data using AES-GCM
 */
export async function decrypt(
  encryptedData: string,
  password: string,
  iv: string,
  salt: string
): Promise<string> {
  try {
    const key = await deriveKey(password, salt);

    const encryptedArray = encryptedData.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || [];
    const encryptedBuffer = new Uint8Array(encryptedArray);
    const ivBuffer = new Uint8Array(iv.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer,
      },
      key,
      encryptedBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generate a random mnemonic phrase (BIP-39)
 * Uses proper BIP-39 implementation from ethers.js
 */
export function generateMnemonic(): string {
  // Re-export from proper BIP-39 implementation
  const { generateMnemonic: generateBip39Mnemonic } = require('./bip39Utils');
  return generateBip39Mnemonic(12); // Default to 12 words
}

/**
 * Validate a mnemonic phrase
 * Uses proper BIP-39 validation from ethers.js
 */
export function validateMnemonic(mnemonic: string): boolean {
  const { validateMnemonic: validateBip39Mnemonic } = require('./bip39Utils');
  return validateBip39Mnemonic(mnemonic);
}

/**
 * Generate a random private key (for testing only)
 * WARNING: Never use this in production! Use BIP-39 derivation instead.
 */
export function generatePrivateKey(): string {
  const array = new Uint8Array(32);
  safeGetRandomValues(array);
  return '0x' + Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Derive address from private key
 * Uses proper ethers.js address derivation
 */
export function deriveAddress(privateKey: string): string {
  const { deriveAddressFromPrivateKey: deriveEthAddress } = require('./bip39Utils');
  try {
    return deriveEthAddress(privateKey);
  } catch (error) {
    // Fallback for invalid keys
    console.error('Failed to derive address:', error);
    return '0x0000000000000000000000000000000000000000';
  }
}