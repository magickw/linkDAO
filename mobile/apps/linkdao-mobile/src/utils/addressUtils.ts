/**
 * Address Utilities
 * Handles wallet address normalization and validation
 */

/**
 * Normalize a wallet address to lowercase for case-insensitive comparisons
 * @param address - The wallet address to normalize
 * @returns Normalized lowercase address
 */
export function normalizeAddress(address: string): string {
  if (!address) return '';
  return address.toLowerCase();
}

/**
 * Compare two wallet addresses (case-insensitive)
 * @param address1 - First address
 * @param address2 - Second address
 * @returns True if addresses match (case-insensitive)
 */
export function addressesMatch(address1: string, address2: string): boolean {
  if (!address1 || !address2) return false;
  return normalizeAddress(address1) === normalizeAddress(address2);
}

/**
 * Validate Ethereum address format
 * @param address - The address to validate
 * @returns True if valid Ethereum address
 */
export function isValidEthereumAddress(address: string): boolean {
  if (!address) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Shorten an address for display (e.g., 0x1234...5678)
 * @param address - The address to shorten
 * @param chars - Number of characters to show at start and end (default: 4)
 * @returns Shortened address
 */
export function shortenAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  const normalized = normalizeAddress(address);
  return `${normalized.substring(0, chars + 2)}...${normalized.substring(normalized.length - chars)}`;
}