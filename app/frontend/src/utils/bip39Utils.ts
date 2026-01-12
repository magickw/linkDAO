/**
 * BIP-39 Utilities
 * Proper BIP-39 mnemonic generation, validation, and key derivation
 */

import { HDNodeWallet, Mnemonic, entropyToMnemonic, mnemonicToEntropy, wordlist, Wallet } from 'ethers';

/**
 * Generate a new BIP-39 mnemonic phrase
 * @param wordCount Number of words (12 or 24)
 * @returns Mnemonic phrase
 */
export function generateMnemonic(wordCount: 12 | 24 = 12): string {
  const entropyBytes = wordCount === 12 ? 16 : 32; // 128 bits for 12 words, 256 bits for 24 words
  
  // Generate mnemonic and check for duplicates
  let mnemonic: string;
  let attempts = 0;
  const maxAttempts = 100; // Prevent infinite loop
  
  do {
    // Use HDNodeWallet.createRandom() to generate a wallet with mnemonic
    // This is the proper way in ethers.js v6
    const wallet = HDNodeWallet.createRandom();
    mnemonic = wallet.mnemonic.phrase;
    attempts++;
    
    // If we've tried too many times, log a warning and return the last result
    // (this should be extremely rare given the entropy space)
    if (attempts >= maxAttempts) {
      console.warn(`Generated ${maxAttempts} mnemonics with duplicate words. Returning last result.`);
      break;
    }
  } while (hasDuplicateWords(mnemonic));
  
  return mnemonic;
}

/**
 * Check if a mnemonic has duplicate words
 * @param mnemonic Mnemonic phrase
 * @returns True if duplicate words found
 */
export function hasDuplicateWords(mnemonic: string): boolean {
  const words = mnemonic.trim().split(/\s+/);
  const uniqueWords = new Set(words);
  return words.length !== uniqueWords.size;
}

/**
 * Validate a BIP-39 mnemonic phrase
 * @param mnemonic Mnemonic phrase to validate
 * @returns True if valid
 */
export function validateMnemonic(mnemonic: string): boolean {
  try {
    // Check for duplicate words first
    if (hasDuplicateWords(mnemonic)) {
      return false;
    }
    
    // Validate BIP-39 format and checksum
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
    // In ethers.js v6, HDNodeWallet.fromPhrase() creates a wallet at the specified derivation path
    // We don't need to derive again - just return the private key directly
    const hdNode = HDNodeWallet.fromPhrase(mnemonic, derivationPath);
    return hdNode.privateKey;
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
    const wallet = new Wallet(privateKey);
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
 * Validate mnemonic word count
 * @param mnemonic Mnemonic phrase
 * @returns True if valid word count
 */
export function isValidWordCount(mnemonic: string): boolean {
  const words = mnemonic.trim().split(/\s+/);
  return words.length === 12 || words.length === 24;
}

/**
 * Check if mnemonic uses valid BIP-39 words
 * @param mnemonic Mnemonic phrase
 * @returns True if all words are valid
 */
export function hasValidWords(mnemonic: string): boolean {
  const words = mnemonic.trim().split(/\s+/);
  const validWords = getWordList();
  return words.every(word => validWords.includes(word.toLowerCase()));
}

/**
 * Get mnemonic strength
 * @param mnemonic Mnemonic phrase
 * @returns Strength level
 */
export function getMnemonicStrength(mnemonic: string): 'weak' | 'good' | 'strong' {
  const words = mnemonic.trim().split(/\s+/);
  if (words.length === 24) {
    return 'strong';
  } else if (words.length === 12) {
    return 'good';
  }
  return 'weak';
}

/**
 * Derive multiple addresses from a mnemonic
 * @param mnemonic Mnemonic phrase
 * @param derivationPath Base derivation path
 * @param count Number of addresses to derive
 * @returns Array of addresses
 */
export function deriveMultipleAddresses(
  mnemonic: string,
  derivationPath: string = "m/44'/60'/0'/0/0",
  count: number = 1
): string[] {
  const addresses: string[] = [];
  for (let i = 0; i < count; i++) {
    const address = deriveAddressFromMnemonic(mnemonic, derivationPath, i);
    addresses.push(address);
  }
  return addresses;
}

/**
 * Get account index from derivation path
 * @param derivationPath BIP-32/44 derivation path
 * @returns Account index
 */
export function getAccountIndex(derivationPath: string): number {
  const match = derivationPath.match(/\/(\d+)\/?$/);
  return match ? parseInt(match[1]) : 0;
}

/**
 * Get change index from derivation path
 * @param derivationPath BIP-32/44 derivation path
 * @returns Change index
 */
export function getChangeIndex(derivationPath: string): number {
  const parts = derivationPath.split('/');
  if (parts.length >= 5) {
    const changeIndex = parseInt(parts[4].replace("'", ""));
    return isNaN(changeIndex) ? 0 : changeIndex;
  }
  return 0;
}

/**
 * Validate derivation path format
 * @param derivationPath BIP-32/44 derivation path
 * @returns True if valid format
 */
export function isValidDerivationPath(derivationPath: string): boolean {
  // BIP-44 path format: m/44'/60'/0'/0/0
  const bip44Pattern = /^m\/\d+'\/\d+'\/\d+'\/\d+'\/\d+$/;
  return bip44Pattern.test(derivationPath);
}

/**
 * Get wallet type from derivation path
 * @param derivationPath BIP-44 derivation path
 * @returns Wallet type
 */
export function getWalletType(derivationPath: string): 'ethereum' | 'bitcoin' | 'other' {
  const coinType = derivationPath.split('/')[2].replace("'", '');
  switch (coinType) {
    case '60':
      return 'ethereum';
    case '0':
      return 'bitcoin';
    default:
      return 'other';
  }
}

/**
 * Get account type from derivation path
 * @param derivationPath BIP-44 derivation path
 * @returns Account type
 */
export function getAccountType(derivationPath: string): 'default' | 'legacy' | 'other' {
  const accountType = derivationPath.split('/')[3].replace("'", "");
  switch (accountType) {
    case '0':
      return 'default';
    case '1':
      return 'legacy';
    default:
      return 'other';
  }
}