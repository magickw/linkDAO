/**
 * Transaction Validation Utility
 * Validates transactions before signing to prevent common issues
 */

// Known contract addresses (in production, this would be fetched from a trusted API)
const KNOWN_CONTRACTS = new Map<string, { name: string; verified: boolean }>([
  // Add known contracts here
  // Example: '0x0000000000000000000000000000000000000000': { name: 'Example', verified: true }
]);

// Transfer thresholds
const LARGE_TRANSFER_THRESHOLD = parseEther('10000'); // 10,000 ETH
const MEDIUM_TRANSFER_THRESHOLD = parseEther('1000'); // 1,000 ETH

/**
 * Validate an Ethereum address
 */
export const validateAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Check if an address is a contract
 */
export const isContractAddress = (address: string): boolean => {
  return KNOWN_CONTRACTS.has(address.toLowerCase());
};

/**
 * Get contract information
 */
export const getContractInfo = (
  address: string
): { name: string; verified: boolean } | undefined => {
  return KNOWN_CONTRACTS.get(address.toLowerCase());
};

/**
 * Add a known contract
 */
export const addKnownContract = (
  address: string,
  name: string,
  verified: boolean
): void => {
  KNOWN_CONTRACTS.set(address.toLowerCase(), { name, verified });
};

/**
 * Validate a transaction
 */
export const validateTransaction = ({
  to,
  value,
  data,
  from,
}: {
  to: string;
  value: bigint;
  data: `0x${string}`;
  from?: string;
}): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} => {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Validate recipient address
  if (!validateAddress(to)) {
    errors.push('Invalid recipient address format');
  }

  // Validate sender address if provided
  if (from && !validateAddress(from)) {
    errors.push('Invalid sender address format');
  }

  // Check for zero address recipient
  if (to.toLowerCase() === '0x0000000000000000000000000000000000000000') {
    errors.push('Cannot send to zero address');
  }

  // Check for self-transfer
  if (from && to.toLowerCase() === from.toLowerCase()) {
    warnings.push('Sending to same address');
  }

  // Check transfer amount
  if (value < 0n) {
    errors.push('Transfer amount cannot be negative');
  }

  // Check for large transfers
  if (value > LARGE_TRANSFER_THRESHOLD) {
    warnings.push('Very large transfer amount detected');
  } else if (value > MEDIUM_TRANSFER_THRESHOLD) {
    warnings.push('Large transfer amount detected');
  }

  // Check for contract interactions
  if (data && data.length > 10) {
    const contractInfo = getContractInfo(to);

    if (!contractInfo) {
      warnings.push('Interacting with unknown contract');
    } else if (!contractInfo.verified) {
      warnings.push(`Interacting with unverified contract: ${contractInfo.name}`);
    } else {
      warnings.push(`Interacting with verified contract: ${contractInfo.name}`);
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
};

/**
 * Validate gas parameters
 */
export const validateGasParameters = ({
  gasLimit,
  maxFeePerGas,
  maxPriorityFeePerGas,
  gasPrice,
}: {
  gasLimit?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  gasPrice?: bigint;
}): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} => {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Security gas limit
  const SECURITY_MAX_GAS_LIMIT = 500000n;
  const NETWORK_MAX_GAS_LIMIT = 16777215n;
  const maxGasLimit =
    SECURITY_MAX_GAS_LIMIT < NETWORK_MAX_GAS_LIMIT
      ? SECURITY_MAX_GAS_LIMIT
      : NETWORK_MAX_GAS_LIMIT;

  if (gasLimit && gasLimit > maxGasLimit) {
    errors.push(`Gas limit exceeds maximum allowable limit of ${maxGasLimit}`);
  }

  if (maxFeePerGas && maxPriorityFeePerGas) {
    if (maxPriorityFeePerGas > maxFeePerGas) {
      errors.push('Priority fee cannot exceed max fee');
    }
  }

  // Check for unusually high gas prices
  const HIGH_GAS_PRICE_THRESHOLD = parseGwei('100'); // 100 gwei
  if (gasPrice && gasPrice > HIGH_GAS_PRICE_THRESHOLD) {
    warnings.push('High gas price detected');
  }
  if (maxFeePerGas && maxFeePerGas > HIGH_GAS_PRICE_THRESHOLD) {
    warnings.push('High max fee per gas detected');
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
};

/**
 * Helper function to parse GWEI to wei
 */
function parseGwei(gwei: string): bigint {
  return BigInt(Math.floor(parseFloat(gwei) * 1e9));
}

/**
 * Calculate estimated transaction cost
 */
export const calculateTransactionCost = (
  gasLimit: bigint,
  gasPrice: bigint
): {
  costWei: bigint;
  costEth: string;
  costUsd: number; // Approximate, assuming ETH price of $2000
} => {
  const costWei = gasLimit * gasPrice;
  const costEth = (Number(costWei) / 1e18).toFixed(6);
  const costUsd = (Number(costEth) * 2000); // Approximate ETH price

  return {
    costWei,
    costEth,
    costUsd,
  };
};