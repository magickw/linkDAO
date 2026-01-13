/**
 * Enhanced Transaction Validator with Contract Verification
 * Validates transactions before signing with contract risk assessment
 */

import { parseEther, formatUnits } from 'viem';
import { contractVerificationService, ContractRiskAssessment } from '../services/contractVerificationService';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  contractRisk?: ContractRiskAssessment;
}

export interface TransactionValidationParams {
  to: string;
  value: bigint;
  data?: string;
  chainId?: number;
}

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
 * Validate a transaction with contract verification
 */
export const validateTransaction = async (
  params: TransactionValidationParams
): Promise<ValidationResult> => {
  const { to, value, data, chainId = 1 } = params;
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Validate recipient address
  if (!validateAddress(to)) {
    errors.push('Invalid recipient address');
    return { valid: false, errors, warnings };
  }

  // 2. Validate amount
  if (value < 0n) {
    errors.push('Amount cannot be negative');
  }

  // 3. Check for large transfers
  if (value > LARGE_TRANSFER_THRESHOLD) {
    warnings.push(`Very large transfer: ${formatUnits(value, 18)} ETH`);
  } else if (value > MEDIUM_TRANSFER_THRESHOLD) {
    warnings.push(`Large transfer: ${formatUnits(value, 18)} ETH`);
  }

  // 4. Check if interacting with a contract
  const isContract = await contractVerificationService.isContract(to, chainId);
  
  if (isContract) {
    warnings.push('Interacting with a smart contract');
    
    // 5. Get contract verification status
    const verification = await contractVerificationService.getContractSourceCode(to, chainId);
    
    if (!verification.isVerified) {
      errors.push('Interacting with unverified contract - Source code not available on Etherscan');
      warnings.push('Unverified contracts may contain malicious code');
    } else {
      warnings.push(`Contract verified: ${verification.contractName || 'Unknown'}`);
      
      if (verification.compilerVersion) {
        warnings.push(`Compiler: ${verification.compilerVersion}`);
      }
    }
    
    // 6. Assess contract security risks
    const riskAssessment = await contractVerificationService.assessContractRisk(to, chainId);
    
    if (riskAssessment.issues.length > 0) {
      errors.push(...riskAssessment.issues.map(issue => `Contract security issue: ${issue}`));
    }
    
    if (riskAssessment.warnings.length > 0) {
      warnings.push(...riskAssessment.warnings.map(warning => `Contract warning: ${warning}`));
    }
    
    if (riskAssessment.riskLevel === 'critical' || riskAssessment.riskLevel === 'high') {
      errors.push(`Contract has ${riskAssessment.riskLevel} security risk (Score: ${riskAssessment.score}/100)`);
    } else if (riskAssessment.riskLevel === 'medium') {
      warnings.push(`Contract has medium security risk (Score: ${riskAssessment.score}/100)`);
    }
    
    // Add recommendations
    if (riskAssessment.recommendations.length > 0) {
      warnings.push('Contract recommendations: ' + riskAssessment.recommendations.join(', '));
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      contractRisk: riskAssessment
    };
  }

  // 7. Check for contract interaction (data field)
  if (data && data.length > 10) {
    warnings.push('Transaction includes contract interaction data');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validate gas parameters
 */
export const validateGasParameters = (params: {
  gasLimit?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  gasPrice?: bigint;
}): ValidationResult => {
  const { gasLimit, maxFeePerGas, maxPriorityFeePerGas, gasPrice } = params;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Security gas limit
  const SECURITY_MAX_GAS_LIMIT = 500000n;
  const NETWORK_MAX_GAS_LIMIT = 16777215n;
  const maxGasLimit = SECURITY_MAX_GAS_LIMIT < NETWORK_MAX_GAS_LIMIT ? SECURITY_MAX_GAS_LIMIT : NETWORK_MAX_GAS_LIMIT;

  if (gasLimit) {
    if (gasLimit > maxGasLimit) {
      errors.push(`Gas limit exceeds maximum allowable limit of ${maxGasLimit}`);
    }
    if (gasLimit < 21000n) {
      errors.push('Gas limit is too low (minimum 21,000 for ETH transfer)');
    }
  }

  // Validate EIP-1559 parameters
  if (maxFeePerGas) {
    if (maxFeePerGas < 0n) {
      errors.push('maxFeePerGas cannot be negative');
    }
    
    // Check if maxFeePerGas is unreasonably high
    const HIGH_GAS_PRICE_THRESHOLD = 1000000000000n; // 1,000 Gwei
    if (maxFeePerGas > HIGH_GAS_PRICE_THRESHOLD) {
      warnings.push(`maxFeePerGas is very high: ${formatUnits(maxFeePerGas, 9)} Gwei`);
    }
  }

  if (maxPriorityFeePerGas) {
    if (maxPriorityFeePerGas < 0n) {
      errors.push('maxPriorityFeePerGas cannot be negative');
    }
    
    if (maxFeePerGas && maxPriorityFeePerGas > maxFeePerGas) {
      errors.push('maxPriorityFeePerGas cannot exceed maxFeePerGas');
    }
    
    // Check if maxPriorityFeePerGas is unreasonably high
    const HIGH_PRIORITY_FEE_THRESHOLD = 500000000000n; // 500 Gwei
    if (maxPriorityFeePerGas > HIGH_PRIORITY_FEE_THRESHOLD) {
      warnings.push(`maxPriorityFeePerGas is very high: ${formatUnits(maxPriorityFeePerGas, 9)} Gwei`);
    }
  }

  // Validate legacy gas price
  if (gasPrice) {
    if (gasPrice < 0n) {
      errors.push('gasPrice cannot be negative');
    }
    
    if (gasPrice > HIGH_GAS_PRICE_THRESHOLD) {
      warnings.push(`gasPrice is very high: ${formatUnits(gasPrice, 9)} Gwei`);
    }
  }

  // Check for EIP-1559 vs legacy gas price consistency
  if (maxFeePerGas && gasPrice) {
    warnings.push('Both EIP-1559 and legacy gas price parameters provided. EIP-1559 will be used.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validate transaction nonce
 */
export const validateNonce = (nonce: bigint, expectedNonce: bigint): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (nonce < 0n) {
    errors.push('Nonce cannot be negative');
  }

  if (nonce < expectedNonce) {
    errors.push(`Nonce is too low. Expected: ${expectedNonce}, Got: ${nonce}`);
  }

  if (nonce > expectedNonce + 10n) {
    warnings.push(`Nonce is significantly higher than expected. Expected: ${expectedNonce}, Got: ${nonce}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Get transaction summary
 */
export const getTransactionSummary = (params: TransactionValidationParams): {
  type: 'transfer' | 'contract_interaction';
  recipient: string;
  amount: string;
  hasData: boolean;
  isContract: boolean;
} => {
  const { to, value, data } = params;
  
  return {
    type: data && data.length > 10 ? 'contract_interaction' : 'transfer',
    recipient: to,
    amount: value > 0n ? formatUnits(value, 18) + ' ETH' : '0 ETH',
    hasData: !!(data && data.length > 10),
    isContract: false // Would need async check
  };
};

/**
 * Batch validate multiple transactions
 */
export const batchValidateTransactions = async (
  transactions: TransactionValidationParams[]
): Promise<ValidationResult[]> => {
  return Promise.all(transactions.map(tx => validateTransaction(tx)));
};