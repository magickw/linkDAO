/**
 * Share ID Generator
 * Generates short, URL-safe identifiers for post sharing
 * Uses base62 encoding for compact, readable IDs
 */

const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Generate a random base62 share ID
 * @param length - Length of the share ID (default: 8)
 * @returns A random base62 string
 */
export function generateShareId(length: number = 8): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * BASE62_CHARS.length);
    result += BASE62_CHARS[randomIndex];
  }
  return result;
}

/**
 * Encode a UUID to a shorter base62 string
 * @param uuid - UUID to encode
 * @returns Base62 encoded string
 */
export function encodeUuidToBase62(uuid: string): string {
  // Remove hyphens from UUID
  const hex = uuid.replace(/-/g, '');
  
  // Convert hex to BigInt
  const num = BigInt('0x' + hex);
  
  // Convert to base62
  let result = '';
  let remaining = num;
  
  while (remaining > 0n) {
    const index = Number(remaining % 62n);
    result = BASE62_CHARS[index] + result;
    remaining = remaining / 62n;
  }
  
  return result || '0';
}

/**
 * Decode a base62 string back to UUID
 * @param base62 - Base62 encoded string
 * @returns Original UUID
 */
export function decodeBase62ToUuid(base62: string): string {
  // Convert base62 to BigInt
  let num = 0n;
  
  for (let i = 0; i < base62.length; i++) {
    const char = base62[i];
    const value = BASE62_CHARS.indexOf(char);
    if (value === -1) {
      throw new Error(`Invalid base62 character: ${char}`);
    }
    num = num * 62n + BigInt(value);
  }
  
  // Convert BigInt to hex
  let hex = num.toString(16).padStart(32, '0');
  
  // Format as UUID
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Validate if a string is a valid share ID format
 * @param shareId - String to validate
 * @returns true if valid share ID format
 */
export function isValidShareId(shareId: string): boolean {
  if (!shareId || typeof shareId !== 'string') {
    return false;
  }
  
  // Check length (typically 8-16 characters)
  if (shareId.length < 6 || shareId.length > 22) {
    return false;
  }
  
  // Check if all characters are valid base62
  for (const char of shareId) {
    if (!BASE62_CHARS.includes(char)) {
      return false;
    }
  }
  
  return true;
}
