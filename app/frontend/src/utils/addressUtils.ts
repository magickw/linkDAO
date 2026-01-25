/**
 * Address Utility Functions
 * Centralized functions for address normalization and validation
 */

/**
 * Normalize a wallet address to lowercase
 * This ensures consistent address handling across the entire application
 *
 * @param address - The wallet address to normalize
 * @returns The normalized (lowercase) address, or undefined if input is undefined
 */
export function normalizeAddress(address?: string): string | undefined {
  if (!address) return undefined;
  return address.toLowerCase();
}

/**
 * Validate wallet address format (Ethereum address)
 * Checks for valid hex format: 0x + 40 hex characters
 *
 * @param address - The address to validate
 * @returns true if valid, false otherwise
 */
export function isValidAddress(address?: string): boolean {
  if (!address) return false;
  // Match 0x followed by exactly 40 hex characters (case-insensitive)
  return /^0x[a-fA-F0-9]{40}$/i.test(address);
}

/**
 * Normalize and validate an address
 * Returns normalized address if valid, undefined otherwise
 *
 * @param address - The address to normalize and validate
 * @returns Normalized address if valid, undefined otherwise
 */
export function normalizeAndValidateAddress(address?: string): string | undefined {
  if (!isValidAddress(address)) return undefined;
  return normalizeAddress(address);
}

/**
 * Compare two addresses (case-insensitive comparison)
 *
 * @param addr1 - First address to compare
 * @param addr2 - Second address to compare
 * @returns true if addresses are the same (ignoring case), false otherwise
 */
export function addressesEqual(addr1?: string, addr2?: string): boolean {
  if (!addr1 || !addr2) return false;
  return addr1.toLowerCase() === addr2.toLowerCase();
}

/**
 * Truncate an address for display purposes
 * Example: 0x1234...5678
 *
 * @param address - The address to truncate
 * @param startChars - Number of characters to show at start (default: 6)
 * @param endChars - Number of characters to show at end (default: 4)
 * @returns Truncated address string
 */
export function truncateAddress(address?: string, startChars: number = 6, endChars: number = 4): string {
  if (!address || !isValidAddress(address)) return '';
  return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
}
