/**
 * Chain ID Validation Utility
 * Validates chain IDs to prevent cross-chain attacks
 */

/**
 * Supported chain IDs
 */
export const SUPPORTED_CHAINS = {
  ETHEREUM: 1,
  GOERLI: 5,
  SEPOLIA: 11155111,
  POLYGON: 137,
  MUMBAI: 80001,
  ARBITRUM: 42161,
  ARBITRUM_GOERLI: 421613,
  ARBITRUM_SEPOLIA: 421614,
  OPTIMISM: 10,
  OPTIMISM_GOERLI: 420,
  OPTIMISM_SEPOLIA: 11155420,
  BASE: 8453,
  BASE_GOERLI: 84531,
  BASE_SEPOLIA: 84532,
  BSC: 56,
  BSC_TESTNET: 97,
  AVALANCHE: 43114,
  AVALANCHE_FUJI: 43113,
  FANTOM: 250,
  FANTOM_TESTNET: 4002,
} as const;

export type SupportedChainId = typeof SUPPORTED_CHAINS[keyof typeof SUPPORTED_CHAINS];

/**
 * Chain names
 */
export const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum Mainnet',
  5: 'Goerli Testnet',
  11155111: 'Sepolia Testnet',
  137: 'Polygon Mainnet',
  80001: 'Mumbai Testnet',
  42161: 'Arbitrum One',
  421613: 'Arbitrum Goerli',
  421614: 'Arbitrum Sepolia',
  10: 'Optimism Mainnet',
  420: 'Optimism Goerli',
  11155420: 'Optimism Sepolia',
  8453: 'Base Mainnet',
  84531: 'Base Goerli',
  84532: 'Base Sepolia',
  56: 'BNB Smart Chain',
  97: 'BNB Smart Chain Testnet',
  43114: 'Avalanche C-Chain',
  43113: 'Avalanche Fuji Testnet',
  250: 'Fantom Opera',
  4002: 'Fantom Testnet',
};

/**
 * Chain validation result
 */
export interface ChainValidationResult {
  valid: boolean;
  chainId: number;
  chainName?: string;
  error?: string;
  isTestnet?: boolean;
}

/**
 * Validate chain ID
 */
export function validateChainId(chainId: number): ChainValidationResult {
  // Check if chain ID is a valid number
  if (typeof chainId !== 'number' || isNaN(chainId) || chainId <= 0) {
    return {
      valid: false,
      chainId,
      error: 'Invalid chain ID: must be a positive number',
    };
  }

  // Check if chain is supported
  if (!Object.values(SUPPORTED_CHAINS).includes(chainId as SupportedChainId)) {
    return {
      valid: false,
      chainId,
      error: `Unsupported chain ID: ${chainId}`,
    };
  }

  // Get chain name
  const chainName = CHAIN_NAMES[chainId];

  // Determine if it's a testnet
  const isTestnet = [
    5, 11155111, 80001, 421613, 421614, 420, 11155420,
    84531, 84532, 97, 43113, 4002
  ].includes(chainId);

  return {
    valid: true,
    chainId,
    chainName,
    isTestnet,
  };
}

/**
 * Validate chain ID matches public client
 */
export function validateChainIdMatch(
  requestChainId: number,
  clientChainId: number
): ChainValidationResult {
  // Validate request chain ID
  const requestValidation = validateChainId(requestChainId);
  if (!requestValidation.valid) {
    return requestValidation;
  }

  // Validate client chain ID
  const clientValidation = validateChainId(clientChainId);
  if (!clientValidation.valid) {
    return clientValidation;
  }

  // Check if chain IDs match
  if (requestChainId !== clientChainId) {
    return {
      valid: false,
      chainId: requestChainId,
      error: `Chain ID mismatch: Requested ${requestValidation.chainName} (${requestChainId}), but connected to ${clientValidation.chainName} (${clientChainId})`,
    };
  }

  return {
    valid: true,
    chainId: requestChainId,
    chainName: requestValidation.chainName,
    isTestnet: requestValidation.isTestnet,
  };
}

/**
 * Check if chain is testnet
 */
export function isTestnet(chainId: number): boolean {
  const validation = validateChainId(chainId);
  return validation.valid ? (validation.isTestnet || false) : false;
}

/**
 * Check if chain is mainnet
 */
export function isMainnet(chainId: number): boolean {
  const validation = validateChainId(chainId);
  return validation.valid ? !validation.isTestnet : false;
}

/**
 * Get all supported chain IDs
 */
export function getSupportedChainIds(): SupportedChainId[] {
  return Object.values(SUPPORTED_CHAINS);
}

/**
 * Get chain name by ID
 */
export function getChainName(chainId: number): string | undefined {
  return CHAIN_NAMES[chainId];
}

/**
 * Validate multiple chain IDs
 */
export function validateMultipleChainIds(chainIds: number[]): ChainValidationResult[] {
  return chainIds.map(chainId => validateChainId(chainId));
}

/**
 * Check if all chain IDs are valid
 */
export function areAllChainIdsValid(chainIds: number[]): boolean {
  return validateMultipleChainIds(chainIds).every(result => result.valid);
}

/**
 * Get chain validation error message
 */
export function getChainValidationErrorMessage(result: ChainValidationResult): string {
  if (result.valid) {
    return `Valid chain: ${result.chainName} (${result.chainId})`;
  }
  return result.error || `Invalid chain ID: ${result.chainId}`;
}