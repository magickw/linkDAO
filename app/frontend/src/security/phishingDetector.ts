/**
 * Phishing Detection Utility
 * Detects suspicious addresses and potential phishing attempts
 */

// Known malicious addresses (in production, this would be fetched from a trusted API)
const KNOWN_MALICIOUS_ADDRESSES = new Set<string>([
  // Add known malicious addresses here
  // Example: '0x0000000000000000000000000000000000000000'
]);

// Suspicious address patterns
const SUSPICIOUS_PATTERNS = [
  // Addresses with too many repeated characters
  /(.)\1{10,}/,
  // Addresses with sequential characters
  /012345|543210|abcdef|fedcba/i,
];

/**
 * Check if an address matches known malicious addresses
 */
export const isKnownMaliciousAddress = (address: string): boolean => {
  return KNOWN_MALICIOUS_ADDRESSES.has(address.toLowerCase());
};

/**
 * Check if an address has suspicious patterns
 */
export const hasSuspiciousPattern = (address: string): boolean => {
  return SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(address));
};

/**
 * Detect if a transaction might be a phishing attempt
 */
export const detectPhishing = (
  targetAddress: string,
  value?: bigint,
  data?: string
): {
  isSuspicious: boolean;
  warnings: string[];
  riskLevel: 'low' | 'medium' | 'high';
} => {
  const warnings: string[] = [];
  let riskLevel: 'low' | 'medium' | 'high' = 'low';

  // Check against known malicious addresses
  if (isKnownMaliciousAddress(targetAddress)) {
    warnings.push('Address is on a known malicious list');
    riskLevel = 'high';
  }

  // Check for suspicious patterns
  if (hasSuspiciousPattern(targetAddress)) {
    warnings.push('Address has suspicious character patterns');
    riskLevel = riskLevel === 'high' ? 'high' : 'medium';
  }

  // Check for large transfers to unknown addresses
  if (value && value > parseEther('1000')) {
    warnings.push('Large transfer amount detected');
    riskLevel = riskLevel === 'high' ? 'high' : 'medium';
  }

  // Check for contract interactions with unknown contracts
  if (data && data.length > 10) {
    // This is a contract interaction
    warnings.push('Interacting with a smart contract');
    // In production, you'd check if the contract is verified and known
  }

  return {
    isSuspicious: warnings.length > 0,
    warnings,
    riskLevel,
  };
};

/**
 * Add a malicious address to the known list
 * (In production, this would sync with a backend API)
 */
export const reportMaliciousAddress = (address: string): void => {
  KNOWN_MALICIOUS_ADDRESSES.add(address.toLowerCase());
  // In production, send to backend API
  console.warn(`Reported malicious address: ${address}`);
};

/**
 * Get risk level color for UI
 */
export const getRiskLevelColor = (riskLevel: 'low' | 'medium' | 'high'): string => {
  switch (riskLevel) {
    case 'low':
      return 'text-green-500';
    case 'medium':
      return 'text-yellow-500';
    case 'high':
      return 'text-red-500';
  }
};

/**
 * Helper function to parse ETH to wei
 */
function parseEther(eth: string): bigint {
  return BigInt(Math.floor(parseFloat(eth) * 1e18));
}